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
