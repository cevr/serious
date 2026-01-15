import { Database } from "bun:sqlite"
import { FileSystem, Path } from "@effect/platform"
import { Config, Context, Effect, Layer, Option } from "effect"
import type {
  Card,
  CardId,
  Deck,
  DeckId,
  DeckStats,
  ReviewLog,
  DailyProgress,
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
  new_cards_per_day INTEGER DEFAULT 20,
  reviews_per_day INTEGER DEFAULT 200,
  stage TEXT DEFAULT 'vocabulary',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Cards table with FSRS fields
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,

  -- FSRS scheduling fields
  due TEXT NOT NULL,
  stability REAL NOT NULL DEFAULT 0,
  difficulty REAL NOT NULL DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state TEXT DEFAULT 'new',
  last_review TEXT,

  -- Content (JSON strings)
  front TEXT NOT NULL,
  back TEXT NOT NULL,

  -- Media references
  audio_front TEXT,
  audio_back TEXT,
  image TEXT,

  -- Personal note (Fluent Forever principle)
  personal_note TEXT,

  -- Organization
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL
);

-- Index for efficient due card queries
CREATE INDEX IF NOT EXISTS idx_cards_deck_due ON cards(deck_id, due, state);
CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);

-- Review logs for analytics
CREATE TABLE IF NOT EXISTS review_logs (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  state TEXT NOT NULL,
  scheduled_days REAL NOT NULL,
  elapsed_days REAL NOT NULL,
  reviewed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_logs_card ON review_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_date ON review_logs(reviewed_at);

-- Daily progress for streak tracking
CREATE TABLE IF NOT EXISTS daily_progress (
  date TEXT PRIMARY KEY,
  new_cards INTEGER DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  correct_reviews INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0
);

-- Settings key-value store
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`

export interface DatabaseService {
  // Card operations
  readonly getCard: (id: CardId) => Effect.Effect<Option.Option<Card>>
  readonly getCardsByDeck: (deckId: DeckId) => Effect.Effect<readonly Card[]>
  readonly getDueCards: (
    deckId: DeckId,
    limit: number,
    now: Date
  ) => Effect.Effect<readonly Card[]>
  readonly insertCard: (card: Card) => Effect.Effect<void>
  readonly updateCard: (card: Card) => Effect.Effect<void>
  readonly deleteCard: (id: CardId) => Effect.Effect<void>

  // Deck operations
  readonly getDeck: (id: DeckId) => Effect.Effect<Option.Option<Deck>>
  readonly getAllDecks: () => Effect.Effect<readonly Deck[]>
  readonly insertDeck: (deck: Deck) => Effect.Effect<void>
  readonly updateDeck: (deck: Deck) => Effect.Effect<void>
  readonly deleteDeck: (id: DeckId) => Effect.Effect<void>
  readonly getDeckStats: (id: DeckId) => Effect.Effect<DeckStats>

  // Review logs
  readonly insertReviewLog: (log: ReviewLog) => Effect.Effect<void>
  readonly getReviewLogs: (cardId: CardId) => Effect.Effect<readonly ReviewLog[]>

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
}

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  DatabaseService
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

      // Open database
      const db = new Database(dbPath)
      db.exec("PRAGMA journal_mode = WAL")
      db.exec("PRAGMA foreign_keys = ON")

      // Initialize schema
      db.exec(SCHEMA_SQL)

      // Register finalizer to close database
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          db.close()
        })
      )

      return DatabaseService.of({
        // Card operations
        getCard: (id) =>
          Effect.sync(() => {
            const row = db.query("SELECT * FROM cards WHERE id = ?").get(id) as CardRow | null
            return row ? Option.some(rowToCard(row)) : Option.none()
          }),

        getCardsByDeck: (deckId) =>
          Effect.sync(() => {
            const rows = db.query("SELECT * FROM cards WHERE deck_id = ?").all(deckId) as CardRow[]
            return rows.map(rowToCard)
          }),

        getDueCards: (deckId, limit, now) =>
          Effect.sync(() => {
            const rows = db
              .query(
                `SELECT * FROM cards
                 WHERE deck_id = ? AND due <= ?
                 ORDER BY due ASC
                 LIMIT ?`
              )
              .all(deckId, now.toISOString(), limit) as CardRow[]
            return rows.map(rowToCard)
          }),

        insertCard: (card) =>
          Effect.sync(() => {
            db.query(
              `INSERT INTO cards (
                id, deck_id, type, due, stability, difficulty, reps, lapses, state, last_review,
                front, back, audio_front, audio_back, image, personal_note, tags, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
              card.id,
              card.deckId,
              card.type,
              card.due.toISOString(),
              card.stability,
              card.difficulty,
              card.reps,
              card.lapses,
              card.state,
              card.lastReview?.toISOString() ?? null,
              card.front,
              card.back,
              card.audioFront,
              card.audioBack,
              card.image,
              card.personalNote,
              JSON.stringify(card.tags),
              card.createdAt.toISOString()
            )
          }),

        updateCard: (card) =>
          Effect.sync(() => {
            db.query(
              `UPDATE cards SET
                type = ?, due = ?, stability = ?, difficulty = ?, reps = ?, lapses = ?, state = ?, last_review = ?,
                front = ?, back = ?, audio_front = ?, audio_back = ?, image = ?, personal_note = ?, tags = ?
               WHERE id = ?`
            ).run(
              card.type,
              card.due.toISOString(),
              card.stability,
              card.difficulty,
              card.reps,
              card.lapses,
              card.state,
              card.lastReview?.toISOString() ?? null,
              card.front,
              card.back,
              card.audioFront,
              card.audioBack,
              card.image,
              card.personalNote,
              JSON.stringify(card.tags),
              card.id
            )
          }),

        deleteCard: (id) =>
          Effect.sync(() => {
            db.query("DELETE FROM cards WHERE id = ?").run(id)
          }),

        // Deck operations
        getDeck: (id) =>
          Effect.sync(() => {
            const row = db.query("SELECT * FROM decks WHERE id = ?").get(id) as DeckRow | null
            return row ? Option.some(rowToDeck(row)) : Option.none()
          }),

        getAllDecks: () =>
          Effect.sync(() => {
            const rows = db.query("SELECT * FROM decks ORDER BY name").all() as DeckRow[]
            return rows.map(rowToDeck)
          }),

        insertDeck: (deck) =>
          Effect.sync(() => {
            db.query(
              `INSERT INTO decks (
                id, name, description, target_language, native_language,
                new_cards_per_day, reviews_per_day, stage, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
              deck.id,
              deck.name,
              deck.description,
              deck.targetLanguage,
              deck.nativeLanguage,
              deck.newCardsPerDay,
              deck.reviewsPerDay,
              deck.stage,
              deck.createdAt.toISOString(),
              deck.updatedAt.toISOString()
            )
          }),

        updateDeck: (deck) =>
          Effect.sync(() => {
            db.query(
              `UPDATE decks SET
                name = ?, description = ?, target_language = ?, native_language = ?,
                new_cards_per_day = ?, reviews_per_day = ?, stage = ?, updated_at = ?
               WHERE id = ?`
            ).run(
              deck.name,
              deck.description,
              deck.targetLanguage,
              deck.nativeLanguage,
              deck.newCardsPerDay,
              deck.reviewsPerDay,
              deck.stage,
              deck.updatedAt.toISOString(),
              deck.id
            )
          }),

        deleteDeck: (id) =>
          Effect.sync(() => {
            db.query("DELETE FROM decks WHERE id = ?").run(id)
          }),

        getDeckStats: (id) =>
          Effect.sync(() => {
            const now = new Date().toISOString()
            const total = db.query("SELECT COUNT(*) as count FROM cards WHERE deck_id = ?").get(id) as { count: number }
            const newCount = db.query("SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND state = 'new'").get(id) as { count: number }
            const learning = db.query("SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND state IN ('learning', 'relearning')").get(id) as { count: number }
            const review = db.query("SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND state = 'review'").get(id) as { count: number }
            const due = db.query("SELECT COUNT(*) as count FROM cards WHERE deck_id = ? AND due <= ?").get(id, now) as { count: number }

            // Calculate retention rate from recent reviews
            const recentReviews = db.query(
              `SELECT rating FROM review_logs
               WHERE card_id IN (SELECT id FROM cards WHERE deck_id = ?)
               ORDER BY reviewed_at DESC LIMIT 100`
            ).all(id) as { rating: number }[]

            const retentionRate = recentReviews.length > 0
              ? recentReviews.filter(r => r.rating >= 3).length / recentReviews.length
              : 0

            // Calculate streak
            const streak = calculateStreak(db)

            return {
              deckId: id,
              totalCards: total.count,
              newCount: newCount.count,
              learningCount: learning.count,
              reviewCount: review.count,
              dueToday: due.count,
              retentionRate,
              streak,
            } as DeckStats
          }),

        // Review logs
        insertReviewLog: (log) =>
          Effect.sync(() => {
            db.query(
              `INSERT INTO review_logs (id, card_id, rating, state, scheduled_days, elapsed_days, reviewed_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).run(
              log.id,
              log.cardId,
              log.rating,
              log.state,
              log.scheduledDays,
              log.elapsedDays,
              log.reviewedAt.toISOString()
            )
          }),

        getReviewLogs: (cardId) =>
          Effect.sync(() => {
            const rows = db.query(
              "SELECT * FROM review_logs WHERE card_id = ? ORDER BY reviewed_at DESC"
            ).all(cardId) as ReviewLogRow[]
            return rows.map(rowToReviewLog)
          }),

        // Daily progress
        getDailyProgress: (date) =>
          Effect.sync(() => {
            const row = db.query("SELECT * FROM daily_progress WHERE date = ?").get(date) as DailyProgressRow | null
            return row ? Option.some(rowToDailyProgress(row)) : Option.none()
          }),

        upsertDailyProgress: (progress) =>
          Effect.sync(() => {
            db.query(
              `INSERT INTO daily_progress (date, new_cards, reviews, correct_reviews, time_spent_seconds)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(date) DO UPDATE SET
                 new_cards = new_cards + excluded.new_cards,
                 reviews = reviews + excluded.reviews,
                 correct_reviews = correct_reviews + excluded.correct_reviews,
                 time_spent_seconds = time_spent_seconds + excluded.time_spent_seconds`
            ).run(
              progress.date,
              progress.newCards,
              progress.reviews,
              progress.correctReviews,
              progress.timeSpentSeconds
            )
          }),

        // Settings
        getSetting: (key) =>
          Effect.sync(() => {
            const row = db.query("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | null
            return row ? Option.some(row.value) : Option.none()
          }),

        setSetting: (key, value) =>
          Effect.sync(() => {
            db.query(
              "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
            ).run(key, value)
          }),
      })
    })
  )

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
      getDeck: () => Effect.succeed(Option.none()),
      getAllDecks: () => Effect.succeed([]),
      insertDeck: () => Effect.void,
      updateDeck: () => Effect.void,
      deleteDeck: () => Effect.void,
      getDeckStats: (id) =>
        Effect.succeed({
          deckId: id,
          totalCards: 0,
          newCount: 0,
          learningCount: 0,
          reviewCount: 0,
          dueToday: 0,
          retentionRate: 0,
          streak: 0,
        } as DeckStats),
      insertReviewLog: () => Effect.void,
      getReviewLogs: () => Effect.succeed([]),
      getDailyProgress: () => Effect.succeed(Option.none()),
      upsertDailyProgress: () => Effect.void,
      getSetting: () => Effect.succeed(Option.none()),
      setSetting: () => Effect.void,
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
  return {
    id: row.id,
    deckId: row.deck_id,
    type: row.type,
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.last_review ? new Date(row.last_review) : null,
    front: row.front,
    back: row.back,
    audioFront: row.audio_front,
    audioBack: row.audio_back,
    image: row.image,
    personalNote: row.personal_note,
    tags: JSON.parse(row.tags),
    createdAt: new Date(row.created_at),
  } as Card
}

function rowToDeck(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetLanguage: row.target_language,
    nativeLanguage: row.native_language,
    newCardsPerDay: row.new_cards_per_day,
    reviewsPerDay: row.reviews_per_day,
    stage: row.stage,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  } as Deck
}

function rowToReviewLog(row: ReviewLogRow): ReviewLog {
  return {
    id: row.id,
    cardId: row.card_id,
    rating: row.rating,
    state: row.state,
    scheduledDays: row.scheduled_days,
    elapsedDays: row.elapsed_days,
    reviewedAt: new Date(row.reviewed_at),
  } as ReviewLog
}

function rowToDailyProgress(row: DailyProgressRow): DailyProgress {
  return {
    date: row.date,
    newCards: row.new_cards,
    reviews: row.reviews,
    correctReviews: row.correct_reviews,
    timeSpentSeconds: row.time_spent_seconds,
  } as DailyProgress
}

function calculateStreak(db: Database): number {
  const rows = db.query(
    `SELECT date FROM daily_progress WHERE reviews > 0 ORDER BY date DESC`
  ).all() as { date: string }[]

  if (rows.length === 0) return 0

  let streak = 0
  const today = new Date().toISOString().split("T")[0]
  let expectedDate = today

  for (const row of rows) {
    if (row.date === expectedDate) {
      streak++
      // Calculate previous day
      const d = new Date(expectedDate)
      d.setDate(d.getDate() - 1)
      expectedDate = d.toISOString().split("T")[0]!
    } else if (row.date < expectedDate) {
      // Gap in streak
      break
    }
  }

  return streak
}
