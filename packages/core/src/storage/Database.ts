import { Reactivity } from "@effect/experimental"
import { SqliteClient } from "@effect/sql-sqlite-bun"
import * as SqlClient from "@effect/sql/SqlClient"
import { FileSystem, Path } from "@effect/platform"
import { Config, Context, Effect, Layer, Option } from "effect"
import {
  Card,
  CardId,
  DailyProgress,
  Deck,
  DeckId,
  DeckStats,
  ReviewLog,
  ReviewLogId,
} from "@serious/shared"
import type {
  CardId as CardIdType,
  DeckId as DeckIdType,
} from "@serious/shared"
import { DatabaseError } from "../errors"

// Embedded schema SQL (avoids file lookup issues when bundled)
const SCHEMA_SQL = `
-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  target_language TEXT NOT NULL,
  native_language TEXT NOT NULL,
  new_cards_per_day INTEGER NOT NULL DEFAULT 20 CHECK(new_cards_per_day > 0),
  reviews_per_day INTEGER NOT NULL DEFAULT 200 CHECK(reviews_per_day > 0),
  stage TEXT NOT NULL DEFAULT 'vocabulary' CHECK(stage IN ('pronunciation', 'vocabulary', 'grammar')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Cards table with FSRS fields
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('basic', 'minimal-pair', 'cloze', 'image-word', 'ipa', 'spelling')),

  -- FSRS scheduling fields
  due TEXT NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'new' CHECK(state IN ('new', 'learning', 'review', 'relearning')),
  last_review TEXT,

  -- Content
  front TEXT NOT NULL,
  back TEXT NOT NULL,

  -- Media references
  audio_front TEXT,
  audio_back TEXT,
  image TEXT,

  -- Personal note (Fluent Forever principle)
  personal_note TEXT,

  -- Organization
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

-- Index for efficient due card queries
CREATE INDEX IF NOT EXISTS idx_cards_deck_due ON cards(deck_id, due, state);
CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);

-- Review logs for analytics
CREATE TABLE IF NOT EXISTS review_logs (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating IN (1, 2, 3, 4)),
  state TEXT NOT NULL CHECK(state IN ('new', 'learning', 'review', 'relearning')),
  scheduled_days REAL NOT NULL,
  elapsed_days REAL NOT NULL,
  reviewed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_logs_card ON review_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_date ON review_logs(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_review_logs_card_date ON review_logs(card_id, reviewed_at DESC);

-- Daily progress for streak tracking
CREATE TABLE IF NOT EXISTS daily_progress (
  date TEXT PRIMARY KEY,
  new_cards INTEGER NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  correct_reviews INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0
);

-- Settings key-value store
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export interface DatabaseServiceShape {
  // Card operations
  readonly getCard: (id: CardIdType) => Effect.Effect<Option.Option<Card>>
  readonly getCardsByDeck: (deckId: DeckIdType) => Effect.Effect<readonly Card[]>
  readonly getDueCards: (
    deckId: DeckIdType,
    limit: number,
    now: Date
  ) => Effect.Effect<readonly Card[]>
  readonly countNewCardsIntroducedToday: (
    deckId: DeckIdType,
    todayStr: string
  ) => Effect.Effect<number>
  readonly insertCard: (card: Card) => Effect.Effect<void>
  readonly updateCard: (card: Card) => Effect.Effect<void>
  readonly deleteCard: (id: CardIdType) => Effect.Effect<void>
  readonly getFilteredCards: (options: {
    deckId: DeckIdType
    state?: string
    search?: string
    tags?: readonly string[]
    page: number
    pageSize: number
  }) => Effect.Effect<{ cards: readonly Card[]; total: number }>

  // Deck operations
  readonly getDeck: (id: DeckIdType) => Effect.Effect<Option.Option<Deck>>
  readonly getAllDecks: () => Effect.Effect<readonly Deck[]>
  readonly insertDeck: (deck: Deck) => Effect.Effect<void>
  readonly updateDeck: (deck: Deck) => Effect.Effect<void>
  readonly deleteDeck: (id: DeckIdType) => Effect.Effect<void>
  readonly getDeckStats: (id: DeckIdType) => Effect.Effect<DeckStats>

  // Review logs
  readonly insertReviewLog: (log: ReviewLog) => Effect.Effect<void>
  readonly getReviewLogs: (cardId: CardIdType) => Effect.Effect<readonly ReviewLog[]>

  // Daily progress
  readonly getDailyProgress: (date: string) => Effect.Effect<Option.Option<DailyProgress>>
  readonly getDailyProgressRange: (
    from: string,
    to: string
  ) => Effect.Effect<readonly DailyProgress[]>
  readonly upsertDailyProgress: (progress: DailyProgress) => Effect.Effect<void>

  // Settings
  readonly getSetting: (key: string) => Effect.Effect<Option.Option<string>>
  readonly setSetting: (key: string, value: string) => Effect.Effect<void>

  // Transaction support — wraps an Effect in BEGIN/COMMIT/ROLLBACK
  readonly transaction: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  DatabaseServiceShape
>() {
  static Live = Layer.scoped(
    DatabaseService,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path

      // Get database path from config or use default
      const homeDir = yield* Config.string("HOME").pipe(
        Config.withDefault("/tmp")
      )
      const defaultDbPath = path.join(homeDir, ".local", "share", "serious", "srs.db")
      const dbPath = yield* Config.string("SRS_DB_PATH").pipe(
        Config.withDefault(defaultDbPath)
      )

      // Ensure directory exists
      const dir = path.dirname(dbPath)
      yield* fs
        .makeDirectory(dir, { recursive: true })
        .pipe(Effect.catchAll(() => Effect.void))

      // Create SqliteClient (scoped — auto-closes on scope exit)
      const sql = yield* SqliteClient.make({ filename: dbPath })

      // Enable foreign keys
      yield* Effect.orDie(sql`PRAGMA foreign_keys = ON`)

      // Initialize schema
      yield* Effect.orDie(sql.unsafe(SCHEMA_SQL))

      // Helper to convert SqlError to defects (infrastructure failures)
      const orDie = <A>(effect: Effect.Effect<A, import("@effect/sql/SqlError").SqlError>) =>
        Effect.orDie(effect)

      return DatabaseService.of({
        // Card operations
        getCard: (id) =>
          orDie(Effect.gen(function* () {
            const rows = yield* sql<CardRow>`SELECT * FROM cards WHERE id = ${id}`
            const row = rows[0]
            return row ? Option.some(rowToCard(row)) : Option.none()
          })),

        getCardsByDeck: (deckId) =>
          sql<CardRow>`SELECT * FROM cards WHERE deck_id = ${deckId}`.pipe(
            Effect.map((rows) => rows.map(rowToCard)),
            Effect.orDie,
          ),

        getDueCards: (deckId, limit, now) =>
          sql<CardRow>`SELECT * FROM cards
            WHERE deck_id = ${deckId} AND due <= ${now.toISOString()}
            ORDER BY
              CASE state
                WHEN 'learning' THEN 0
                WHEN 'relearning' THEN 1
                WHEN 'review' THEN 2
                WHEN 'new' THEN 3
              END,
              due ASC
            LIMIT ${limit}`.pipe(
            Effect.map((rows) => rows.map(rowToCard)),
            Effect.orDie,
          ),

        countNewCardsIntroducedToday: (deckId, todayStr) =>
          sql<{ count: number }>`
            SELECT COUNT(DISTINCT r.card_id) AS count
            FROM review_logs r
            JOIN cards c ON r.card_id = c.id
            WHERE c.deck_id = ${deckId} AND r.state = 'new' AND r.reviewed_at >= ${todayStr}
          `.pipe(
            Effect.map((rows) => rows[0]?.count ?? 0),
            Effect.orDie,
          ),

        insertCard: (card) =>
          sql`INSERT INTO cards (
            id, deck_id, type, due, stability, difficulty, reps, lapses, state, last_review,
            front, back, audio_front, audio_back, image, personal_note, tags, created_at
          ) VALUES (
            ${card.id}, ${card.deckId}, ${card.type}, ${card.due.toISOString()},
            ${card.stability}, ${card.difficulty}, ${card.reps}, ${card.lapses},
            ${card.state}, ${card.lastReview?.toISOString() ?? null},
            ${card.front}, ${card.back}, ${card.audioFront}, ${card.audioBack},
            ${card.image}, ${card.personalNote}, ${JSON.stringify(card.tags)},
            ${card.createdAt.toISOString()}
          )`.pipe(Effect.asVoid, Effect.orDie),

        updateCard: (card) =>
          sql`UPDATE cards SET
            type = ${card.type}, due = ${card.due.toISOString()},
            stability = ${card.stability}, difficulty = ${card.difficulty},
            reps = ${card.reps}, lapses = ${card.lapses}, state = ${card.state},
            last_review = ${card.lastReview?.toISOString() ?? null},
            front = ${card.front}, back = ${card.back},
            audio_front = ${card.audioFront}, audio_back = ${card.audioBack},
            image = ${card.image}, personal_note = ${card.personalNote},
            tags = ${JSON.stringify(card.tags)}
          WHERE id = ${card.id}`.pipe(Effect.asVoid, Effect.orDie),

        deleteCard: (id) =>
          sql`DELETE FROM cards WHERE id = ${id}`.pipe(Effect.asVoid, Effect.orDie),

        getFilteredCards: (options) =>
          orDie(Effect.gen(function* () {
            // Build dynamic WHERE clause using sql fragments
            const conditions = [sql`deck_id = ${options.deckId}`]

            if (options.state) {
              conditions.push(sql`state = ${options.state}`)
            }
            if (options.search) {
              const like = `%${options.search}%`
              conditions.push(sql`(front LIKE ${like} OR back LIKE ${like})`)
            }
            if (options.tags && options.tags.length > 0) {
              for (const tag of options.tags) {
                conditions.push(sql`tags LIKE ${`%"${tag}"%`}`)
              }
            }

            const where = sql.and(conditions)
            const countRows = yield* sql<{ total: number }>`SELECT COUNT(*) AS total FROM cards WHERE ${where}`
            const total = countRows[0]?.total ?? 0

            const offset = (options.page - 1) * options.pageSize
            const rows = yield* sql<CardRow>`SELECT * FROM cards WHERE ${where} ORDER BY created_at LIMIT ${options.pageSize} OFFSET ${offset}`

            return { cards: rows.map(rowToCard), total }
          })),

        // Deck operations
        getDeck: (id) =>
          orDie(Effect.gen(function* () {
            const rows = yield* sql<DeckRow>`SELECT * FROM decks WHERE id = ${id}`
            const row = rows[0]
            return row ? Option.some(rowToDeck(row)) : Option.none()
          })),

        getAllDecks: () =>
          sql<DeckRow>`SELECT * FROM decks ORDER BY name`.pipe(
            Effect.map((rows) => rows.map(rowToDeck)),
            Effect.orDie,
          ),

        insertDeck: (deck) =>
          sql`INSERT INTO decks (
            id, name, description, target_language, native_language,
            new_cards_per_day, reviews_per_day, stage, created_at, updated_at
          ) VALUES (
            ${deck.id}, ${deck.name}, ${deck.description}, ${deck.targetLanguage},
            ${deck.nativeLanguage}, ${deck.newCardsPerDay}, ${deck.reviewsPerDay},
            ${deck.stage}, ${deck.createdAt.toISOString()}, ${deck.updatedAt.toISOString()}
          )`.pipe(Effect.asVoid, Effect.orDie),

        updateDeck: (deck) =>
          sql`UPDATE decks SET
            name = ${deck.name}, description = ${deck.description},
            target_language = ${deck.targetLanguage}, native_language = ${deck.nativeLanguage},
            new_cards_per_day = ${deck.newCardsPerDay}, reviews_per_day = ${deck.reviewsPerDay},
            stage = ${deck.stage}, updated_at = ${deck.updatedAt.toISOString()}
          WHERE id = ${deck.id}`.pipe(Effect.asVoid, Effect.orDie),

        deleteDeck: (id) =>
          sql`DELETE FROM decks WHERE id = ${id}`.pipe(Effect.asVoid, Effect.orDie),

        getDeckStats: (id) =>
          orDie(Effect.gen(function* () {
            const now = new Date().toISOString()

            // Single aggregate query instead of 5 separate COUNT queries
            const statsRows = yield* sql<{
              total: number
              new_count: number
              learning_count: number
              review_count: number
              due_count: number
            }>`SELECT
              COUNT(*) AS total,
              SUM(CASE WHEN state = 'new' THEN 1 ELSE 0 END) AS new_count,
              SUM(CASE WHEN state IN ('learning', 'relearning') THEN 1 ELSE 0 END) AS learning_count,
              SUM(CASE WHEN state = 'review' THEN 1 ELSE 0 END) AS review_count,
              SUM(CASE WHEN due <= ${now} THEN 1 ELSE 0 END) AS due_count
            FROM cards WHERE deck_id = ${id}`

            const stats = statsRows[0]!

            // Calculate retention rate from recent reviews
            const recentReviews = yield* sql<{ rating: number }>`
              SELECT rating FROM review_logs
              WHERE card_id IN (SELECT id FROM cards WHERE deck_id = ${id})
              ORDER BY reviewed_at DESC LIMIT 100
            `

            const retentionRate = recentReviews.length > 0
              ? recentReviews.filter(r => r.rating >= 2).length / recentReviews.length
              : 0

            // Calculate streak
            const streak = yield* calculateStreak(sql)

            return new DeckStats({
              deckId: id,
              totalCards: stats.total,
              newCount: stats.new_count,
              learningCount: stats.learning_count,
              reviewCount: stats.review_count,
              dueToday: stats.due_count,
              retentionRate,
              streak,
            })
          })),

        // Review logs
        insertReviewLog: (log) =>
          sql`INSERT INTO review_logs (id, card_id, rating, state, scheduled_days, elapsed_days, reviewed_at)
          VALUES (
            ${log.id}, ${log.cardId}, ${log.rating}, ${log.state},
            ${log.scheduledDays}, ${log.elapsedDays}, ${log.reviewedAt.toISOString()}
          )`.pipe(Effect.asVoid, Effect.orDie),

        getReviewLogs: (cardId) =>
          sql<ReviewLogRow>`SELECT * FROM review_logs WHERE card_id = ${cardId} ORDER BY reviewed_at DESC`.pipe(
            Effect.map((rows) => rows.map(rowToReviewLog)),
            Effect.orDie,
          ),

        // Daily progress
        getDailyProgress: (date) =>
          orDie(Effect.gen(function* () {
            const rows = yield* sql<DailyProgressRow>`SELECT * FROM daily_progress WHERE date = ${date}`
            const row = rows[0]
            return row ? Option.some(rowToDailyProgress(row)) : Option.none()
          })),

        getDailyProgressRange: (from, to) =>
          sql<DailyProgressRow>`SELECT * FROM daily_progress WHERE date >= ${from} AND date <= ${to} ORDER BY date`.pipe(
            Effect.map((rows) => rows.map(rowToDailyProgress)),
            Effect.orDie,
          ),

        upsertDailyProgress: (progress) =>
          sql`INSERT INTO daily_progress (date, new_cards, reviews, correct_reviews, time_spent_seconds)
          VALUES (${progress.date}, ${progress.newCards}, ${progress.reviews}, ${progress.correctReviews}, ${progress.timeSpentSeconds})
          ON CONFLICT(date) DO UPDATE SET
            new_cards = new_cards + excluded.new_cards,
            reviews = reviews + excluded.reviews,
            correct_reviews = correct_reviews + excluded.correct_reviews,
            time_spent_seconds = time_spent_seconds + excluded.time_spent_seconds`.pipe(Effect.asVoid, Effect.orDie),

        // Settings
        getSetting: (key) =>
          orDie(Effect.gen(function* () {
            const rows = yield* sql<{ value: string }>`SELECT value FROM settings WHERE key = ${key}`
            const row = rows[0]
            return row ? Option.some(row.value) : Option.none()
          })),

        setSetting: (key, value) =>
          sql`INSERT INTO settings (key, value) VALUES (${key}, ${value})
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`.pipe(Effect.asVoid, Effect.orDie),

        transaction: (effect) =>
          sql.withTransaction(effect).pipe(
            Effect.catchTag("SqlError", (e) => Effect.die(e))
          ),
      })
    })
  ).pipe(Layer.provide(Reactivity.layer))

  // In-memory implementation for testing
  static Test = Layer.succeed(
    DatabaseService,
    DatabaseService.of({
      getCard: () => Effect.succeed(Option.none()),
      getCardsByDeck: () => Effect.succeed([]),
      getDueCards: () => Effect.succeed([]),
      insertCard: () => Effect.void,
      updateCard: () => Effect.void,
      deleteCard: () => Effect.void,
      countNewCardsIntroducedToday: () => Effect.succeed(0),
      getFilteredCards: () => Effect.succeed({ cards: [], total: 0 }),
      getDeck: () => Effect.succeed(Option.none()),
      getAllDecks: () => Effect.succeed([]),
      insertDeck: () => Effect.void,
      updateDeck: () => Effect.void,
      deleteDeck: () => Effect.void,
      getDeckStats: (id) =>
        Effect.succeed(new DeckStats({
          deckId: id,
          totalCards: 0,
          newCount: 0,
          learningCount: 0,
          reviewCount: 0,
          dueToday: 0,
          retentionRate: 0,
          streak: 0,
        })),
      insertReviewLog: () => Effect.void,
      getReviewLogs: () => Effect.succeed([]),
      getDailyProgress: () => Effect.succeed(Option.none()),
      getDailyProgressRange: () => Effect.succeed([]),
      upsertDailyProgress: () => Effect.void,
      getSetting: () => Effect.succeed(Option.none()),
      setSetting: () => Effect.void,
      transaction: (effect) => effect,
    })
  )
}

// Row types for SQLite
interface CardRow {
  id: string
  deck_id: string
  type: string
  due: string
  stability: number
  difficulty: number
  reps: number
  lapses: number
  state: string
  last_review: string | null
  front: string
  back: string
  audio_front: string | null
  audio_back: string | null
  image: string | null
  personal_note: string | null
  tags: string
  created_at: string
}

interface DeckRow {
  id: string
  name: string
  description: string | null
  target_language: string
  native_language: string
  new_cards_per_day: number
  reviews_per_day: number
  stage: string
  created_at: string
  updated_at: string
}

interface ReviewLogRow {
  id: string
  card_id: string
  rating: number
  state: string
  scheduled_days: number
  elapsed_days: number
  reviewed_at: string
}

interface DailyProgressRow {
  date: string
  new_cards: number
  reviews: number
  correct_reviews: number
  time_spent_seconds: number
}

// Row converters
function rowToCard(row: CardRow): Card {
  return new Card({
    id: CardId.make(row.id),
    deckId: DeckId.make(row.deck_id),
    type: row.type as Card["type"],
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as Card["state"],
    lastReview: row.last_review ? new Date(row.last_review) : null,
    front: row.front,
    back: row.back,
    audioFront: row.audio_front,
    audioBack: row.audio_back,
    image: row.image,
    personalNote: row.personal_note,
    tags: JSON.parse(row.tags),
    createdAt: new Date(row.created_at),
  })
}

function rowToDeck(row: DeckRow): Deck {
  return new Deck({
    id: DeckId.make(row.id),
    name: row.name,
    description: row.description,
    targetLanguage: row.target_language,
    nativeLanguage: row.native_language,
    newCardsPerDay: row.new_cards_per_day,
    reviewsPerDay: row.reviews_per_day,
    stage: row.stage as Deck["stage"],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

function rowToReviewLog(row: ReviewLogRow): ReviewLog {
  return new ReviewLog({
    id: ReviewLogId.make(row.id),
    cardId: CardId.make(row.card_id),
    rating: row.rating as ReviewLog["rating"],
    state: row.state as ReviewLog["state"],
    scheduledDays: row.scheduled_days,
    elapsedDays: row.elapsed_days,
    reviewedAt: new Date(row.reviewed_at),
  })
}

function rowToDailyProgress(row: DailyProgressRow): DailyProgress {
  return new DailyProgress({
    date: row.date,
    newCards: row.new_cards,
    reviews: row.reviews,
    correctReviews: row.correct_reviews,
    timeSpentSeconds: row.time_spent_seconds,
  })
}

function calculateStreak(sql: SqlClient.SqlClient) {
  return Effect.gen(function* () {
    const rows = yield* sql<{ date: string }>`
      SELECT date FROM daily_progress WHERE reviews > 0 ORDER BY date DESC
    `

    if (rows.length === 0) return 0

    // Use UTC-based date arithmetic to avoid timezone issues
    const today = new Date()
    const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`

    let streak = 0
    let expectedDate = todayStr

    // If today has no reviews yet, start counting from yesterday
    if (rows[0]?.date !== todayStr) {
      const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1))
      expectedDate = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, "0")}-${String(yesterday.getUTCDate()).padStart(2, "0")}`
    }

    for (const row of rows) {
      if (row.date === expectedDate) {
        streak++
        // Calculate previous day using UTC
        const d = new Date(expectedDate + "T00:00:00Z")
        d.setUTCDate(d.getUTCDate() - 1)
        expectedDate = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
      } else if (row.date < expectedDate) {
        break
      }
    }

    return streak
  })
}
