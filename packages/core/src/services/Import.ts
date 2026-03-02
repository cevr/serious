import { Database } from "bun:sqlite";
import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { Card, CreateCardInput, type DeckId } from "@serious/shared";
import AdmZip from "adm-zip";

import { ImportError } from "../errors";
import { DatabaseService, type DatabaseServiceShape } from "../storage/Database";
import { CardService, type CardServiceShape } from "./Card";

export interface FrequencyImportOptions {
  /** Path to frequency list file (word\tcount per line) */
  readonly filePath: string;
  /** Deck to import into */
  readonly deckId: DeckId;
  /** Max words to import (default: 1000) */
  readonly limit?: number;
  /** Path to extracted Tatoeba sentences.csv */
  readonly sentencesPath?: string;
  /** Path to extracted Tatoeba links.csv */
  readonly linksPath?: string;
  /** ISO 639-3 language code for target language (e.g. "fra", "spa") */
  readonly langCode?: string;
}

export interface TatoebaEnrichResult {
  /** Cards enriched with example sentences */
  readonly enriched: number;
  /** Cards with no matching sentences */
  readonly noMatch: number;
}

export interface ImportResult {
  readonly imported: number;
  readonly skipped: number;
}

export interface ImportServiceShape {
  readonly importApkg: (
    buffer: Uint8Array,
    deckId: DeckId,
  ) => Effect.Effect<ImportResult, ImportError>;

  /** Import top N words from a frequency list, optionally enriched with Tatoeba example sentences */
  readonly importFrequencyList: (
    options: FrequencyImportOptions,
  ) => Effect.Effect<ImportResult, ImportError>;

  /** Enrich existing cards in a deck with Tatoeba example sentence pairs */
  readonly enrichWithTatoeba: (
    deckId: DeckId,
    sentencesPath: string,
    linksPath: string,
    langCode: string,
  ) => Effect.Effect<TatoebaEnrichResult, ImportError>;
}

export class ImportService extends Context.Tag("ImportService")<
  ImportService,
  ImportServiceShape
>() {
  static Live = Layer.effect(
    ImportService,
    Effect.gen(function* () {
      const cardService = yield* CardService;
      const db = yield* DatabaseService;
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;

      return ImportService.of({
        importApkg: (buffer, deckId) =>
          Effect.gen(function* () {
            // Extract SQLite DB from ZIP
            const zip = yield* Effect.try({
              try: () => new AdmZip(Buffer.from(buffer)),
              catch: () =>
                new ImportError({
                  message: "Invalid .apkg file: not a valid ZIP archive",
                }),
            });

            const entries = zip.getEntries();
            const dbEntry = entries.find(
              (e) =>
                e.entryName === "collection.anki21" ||
                e.entryName === "collection.anki2",
            );

            if (!dbEntry) {
              return yield* Effect.fail(
                new ImportError({
                  message: "Invalid .apkg file: no collection database found",
                }),
              );
            }

            // Write to temp file for bun:sqlite
            const tmpDir = path.join("/tmp", `serious-import-${Date.now()}`);
            yield* fs
              .makeDirectory(tmpDir, { recursive: true })
              .pipe(Effect.catchAll(() => Effect.void));

            const tmpPath = path.join(tmpDir, "collection.db");
            const dbData = dbEntry.getData();

            yield* Effect.tryPromise({
              try: () => Bun.write(tmpPath, dbData),
              catch: () =>
                new ImportError({
                  message: "Failed to write temp database file",
                }),
            });

            // Parse and import, then clean up
            const result = yield* parseAndImport(
              tmpPath,
              deckId,
              cardService,
              db,
            ).pipe(
              Effect.ensuring(
                fs
                  .remove(tmpDir, { recursive: true })
                  .pipe(Effect.catchAll(() => Effect.void)),
              ),
            );

            return result;
          }),

        importFrequencyList: (options) =>
          Effect.gen(function* () {
            const {
              filePath,
              deckId,
              limit = 1000,
              sentencesPath,
              linksPath,
              langCode,
            } = options;

            // Read frequency list
            const content = yield* fs
              .readFileString(filePath)
              .pipe(
                Effect.mapError(
                  () =>
                    new ImportError({
                      message: `Failed to read frequency list: ${filePath}`,
                      path: filePath,
                    }),
                ),
              );

            const words = parseFrequencyList(content, limit);

            if (words.length === 0) {
              return yield* Effect.fail(
                new ImportError({
                  message: "Frequency list is empty or has invalid format",
                  path: filePath,
                }),
              );
            }

            // Optionally load Tatoeba sentence pairs for enrichment
            let sentencePairs: Map<string, SentencePair[]> | undefined;
            if (sentencesPath && linksPath && langCode) {
              sentencePairs = yield* loadTatoebaPairs(
                fs,
                sentencesPath,
                linksPath,
                langCode,
              );
            }

            let imported = 0;
            let skipped = 0;

            // Batch all inserts in a single transaction
            yield* db.transaction(
              Effect.gen(function* () {
                for (const { word } of words) {
                  let personalNote: string | undefined;
                  let back = word;

                  if (sentencePairs) {
                    const pairs = findSentencePairs(sentencePairs, word);
                    if (pairs.length > 0) {
                      const pair = pairs[0]!;
                      back = pair.english;
                      const examples = pairs
                        .slice(0, 2)
                        .map((p) => `${p.target}\n→ ${p.english}`)
                        .join("\n\n");
                      personalNote = examples;
                    }
                  }

                  const input = new CreateCardInput({
                    deckId,
                    type: "basic",
                    front: word,
                    back,
                    personalNote,
                  });

                  yield* cardService.create(input).pipe(
                    Effect.map(() => { imported++; }),
                    Effect.catchAll(() => Effect.sync(() => { skipped++; })),
                  );
                }
              })
            );

            return { imported, skipped };
          }),

        enrichWithTatoeba: (deckId, sentencesPath, linksPath, langCode) =>
          Effect.gen(function* () {
            const sentencePairs = yield* loadTatoebaPairs(
              fs,
              sentencesPath,
              linksPath,
              langCode,
            );

            // Get all cards in the deck
            const cards = yield* cardService.getByDeck(deckId);

            let enriched = 0;
            let noMatch = 0;

            for (const card of cards) {
              // Skip cards that already have a personal note
              if (card.personalNote) {
                continue;
              }

              const pairs = findSentencePairs(sentencePairs, card.front);
              if (pairs.length === 0) {
                noMatch++;
                continue;
              }

              const examples = pairs
                .slice(0, 2)
                .map((p) => `${p.target}\n→ ${p.english}`)
                .join("\n\n");

              yield* cardService
                .update(card.id, { personalNote: examples })
                .pipe(
                  Effect.map(() => {
                    enriched++;
                  }),
                  Effect.catchAll(() => {
                    noMatch++;
                    return Effect.void;
                  }),
                );
            }

            return { enriched, noMatch };
          }),
      });
    }),
  );

  static Test = Layer.succeed(
    ImportService,
    ImportService.of({
      importApkg: () => Effect.succeed({ imported: 0, skipped: 0 }),
      importFrequencyList: () => Effect.succeed({ imported: 0, skipped: 0 }),
      enrichWithTatoeba: () => Effect.succeed({ enriched: 0, noMatch: 0 }),
    }),
  );
}

// --- Internal ---

function parseAndImport(
  dbPath: string,
  deckId: DeckId,
  cardService: CardServiceShape,
  db: DatabaseServiceShape,
): Effect.Effect<ImportResult, ImportError> {
  return Effect.gen(function* () {
    const ankiDb = new Database(dbPath, { readonly: true });

    const notes = yield* Effect.try({
      try: () => {
        // Parse models from col table to get field names
        const colRow = ankiDb
          .query("SELECT models FROM col")
          .get() as { models: string } | null;

        if (!colRow) {
          throw new Error("no col table");
        }

        const models = JSON.parse(colRow.models) as Record<string, AnkiModel>;

        // Build field name map: model_id → [field names]
        const fieldMap = new Map<string, string[]>();
        for (const [mid, model] of Object.entries(models)) {
          fieldMap.set(
            mid,
            model.flds.map((f) => f.name),
          );
        }

        // Read all notes
        return ankiDb
          .query("SELECT mid, flds FROM notes")
          .all() as AnkiNote[];
      },
      catch: (err) =>
        new ImportError({
          message: `Failed to parse Anki database: ${err instanceof Error ? err.message : "unknown error"}`,
        }),
    }).pipe(Effect.ensuring(Effect.sync(() => ankiDb.close())));

    let imported = 0;
    let skipped = 0;

    // Batch all inserts in a single transaction
    yield* db.transaction(
      Effect.gen(function* () {
        for (const note of notes) {
          const fields = note.flds.split("\x1f");
          const front = stripHtml(fields[0] ?? "").trim();
          const back = stripHtml(fields[1] ?? "").trim();

          if (!front || !back) {
            skipped++;
            continue;
          }

          const input = new CreateCardInput({
            deckId,
            type: "basic",
            front,
            back,
          });

          yield* cardService.create(input).pipe(
            Effect.map(() => { imported++; }),
            Effect.catchAll(() => Effect.sync(() => { skipped++; })),
          );
        }
      })
    );

    return { imported, skipped };
  });
}

// --- Anki format types ---

interface AnkiModel {
  flds: Array<{ name: string; ord: number }>;
}

interface AnkiNote {
  mid: number;
  flds: string;
}

// --- Frequency list parsing ---

interface FrequencyWord {
  readonly word: string;
  readonly count: number;
}

function parseFrequencyList(content: string, limit: number): FrequencyWord[] {
  const words: FrequencyWord[] = [];

  for (const line of content.split("\n")) {
    if (words.length >= limit) break;

    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format: "word count" (space-separated)
    const spaceIdx = trimmed.lastIndexOf(" ");
    if (spaceIdx === -1) continue;

    const word = trimmed.slice(0, spaceIdx).trim();
    const count = parseInt(trimmed.slice(spaceIdx + 1), 10);

    if (!word || isNaN(count)) continue;

    // Skip single-char function words and numbers
    if (word.length === 1 && /^[a-z0-9]$/i.test(word)) continue;

    words.push({ word, count });
  }

  return words;
}

// --- Tatoeba sentence pair loading ---

interface SentencePair {
  readonly target: string;
  readonly english: string;
}

/**
 * Load Tatoeba sentences + links and build a word → sentence pair index.
 * This is memory-intensive (~300-500MB for full dataset) but runs once per import.
 */
function loadTatoebaPairs(
  fs: FileSystem.FileSystem,
  sentencesPath: string,
  linksPath: string,
  langCode: string,
): Effect.Effect<Map<string, SentencePair[]>, ImportError> {
  return Effect.gen(function* () {
    // Read sentences file
    const sentencesContent = yield* fs
      .readFileString(sentencesPath)
      .pipe(
        Effect.mapError(
          () =>
            new ImportError({
              message: `Failed to read Tatoeba sentences: ${sentencesPath}`,
              path: sentencesPath,
            }),
        ),
      );

    // Build sentence lookup: id → { lang, text }
    const sentences = new Map<string, { lang: string; text: string }>();
    for (const line of sentencesContent.split("\n")) {
      const parts = line.split("\t");
      if (parts.length < 3) continue;
      const [id, lang, text] = parts;
      if (!id || !lang || !text) continue;

      // Only keep target language and English sentences
      if (lang === langCode || lang === "eng") {
        sentences.set(id, { lang, text });
      }
    }

    // Read links file
    const linksContent = yield* fs
      .readFileString(linksPath)
      .pipe(
        Effect.mapError(
          () =>
            new ImportError({
              message: `Failed to read Tatoeba links: ${linksPath}`,
              path: linksPath,
            }),
        ),
      );

    // Build translation map: target_id → english_text
    const translations = new Map<string, string>();
    for (const line of linksContent.split("\n")) {
      const parts = line.split("\t");
      if (parts.length < 2) continue;
      const [fromId, toId] = parts;
      if (!fromId || !toId) continue;

      const from = sentences.get(fromId);
      const to = sentences.get(toId);
      if (!from || !to) continue;

      // target → english direction
      if (from.lang === langCode && to.lang === "eng") {
        translations.set(fromId, to.text);
      }
    }

    // Build word → sentence pair index
    // Index by lowercase words found in target-language sentences
    const wordIndex = new Map<string, SentencePair[]>();

    for (const [id, sentence] of sentences) {
      if (sentence.lang !== langCode) continue;

      const englishTranslation = translations.get(id);
      if (!englishTranslation) continue;

      const pair: SentencePair = {
        target: sentence.text,
        english: englishTranslation,
      };

      // Extract words from the target sentence
      const words = sentence.text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s'-]/gu, "")
        .split(/\s+/)
        .filter((w) => w.length > 1);

      for (const word of words) {
        let pairs = wordIndex.get(word);
        if (!pairs) {
          pairs = [];
          wordIndex.set(word, pairs);
        }
        // Cap at 5 pairs per word to limit memory
        if (pairs.length < 5) {
          pairs.push(pair);
        }
      }
    }

    return wordIndex;
  });
}

/**
 * Find sentence pairs containing a word, preferring shorter sentences.
 */
function findSentencePairs(
  index: Map<string, SentencePair[]>,
  word: string,
): SentencePair[] {
  const pairs = index.get(word.toLowerCase());
  if (!pairs || pairs.length === 0) return [];

  // Sort by target sentence length (prefer shorter, more focused examples)
  return [...pairs].sort((a, b) => a.target.length - b.target.length);
}

// --- Helpers ---

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
