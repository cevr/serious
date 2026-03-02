import { Database } from "bun:sqlite";
import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { CreateCardInput, type DeckId } from "@serious/shared";
import AdmZip from "adm-zip";

import { ImportError } from "../errors";
import { CardService } from "./Card";

export interface ImportService {
  readonly importApkg: (
    buffer: Uint8Array,
    deckId: DeckId,
  ) => Effect.Effect<{ imported: number; skipped: number }, ImportError>;
}

export class ImportService extends Context.Tag("ImportService")<
  ImportService,
  ImportService
>() {
  static Live = Layer.effect(
    ImportService,
    Effect.gen(function* () {
      const cardService = yield* CardService;
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
            ).pipe(
              Effect.ensuring(
                fs
                  .remove(tmpDir, { recursive: true })
                  .pipe(Effect.catchAll(() => Effect.void)),
              ),
            );

            return result;
          }),
      });
    }),
  );

  static Test = Layer.succeed(
    ImportService,
    ImportService.of({
      importApkg: () => Effect.succeed({ imported: 0, skipped: 0 }),
    }),
  );
}

// --- Internal ---

function parseAndImport(
  dbPath: string,
  deckId: DeckId,
  cardService: CardService,
) {
  return Effect.gen(function* () {
    const ankiDb = new Database(dbPath, { readonly: true });

    const result = yield* Effect.try({
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

    for (const note of result) {
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
        Effect.map(() => {
          imported++;
        }),
        Effect.catchAll(() => {
          skipped++;
          return Effect.void;
        }),
      );
    }

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
