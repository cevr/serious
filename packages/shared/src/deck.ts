import { Schema as S } from "effect"
import { DeckIdSchema } from "./ids"

// Learning stages aligned with Fluent Forever progression
export const LearningStage = S.Literal("pronunciation", "vocabulary", "grammar")
export type LearningStage = S.Schema.Type<typeof LearningStage>

// Deck schema
export class Deck extends S.Class<Deck>("Deck")({
  id: DeckIdSchema,
  name: S.String,
  description: S.NullOr(S.String),

  // Language pair
  targetLanguage: S.String, // ISO code, e.g., "es", "ja"
  nativeLanguage: S.String, // ISO code, e.g., "en"

  // Learning settings
  newCardsPerDay: S.Number,
  reviewsPerDay: S.Number,
  stage: LearningStage,

  // Timestamps
  createdAt: S.Date,
  updatedAt: S.Date,
}) {}

// Create deck input
export class CreateDeckInput extends S.Class<CreateDeckInput>("CreateDeckInput")({
  name: S.String.pipe(S.minLength(1), S.maxLength(100)),
  description: S.optional(S.String),
  targetLanguage: S.String.pipe(S.minLength(2), S.maxLength(5)),
  nativeLanguage: S.String.pipe(S.minLength(2), S.maxLength(5)),
  newCardsPerDay: S.optional(S.Number.pipe(S.int(), S.greaterThan(0))),
  reviewsPerDay: S.optional(S.Number.pipe(S.int(), S.greaterThan(0))),
  stage: S.optional(LearningStage),
}) {}

// Deck statistics
export class DeckStats extends S.Class<DeckStats>("DeckStats")({
  deckId: DeckIdSchema,
  totalCards: S.Number,
  newCount: S.Number,
  learningCount: S.Number,
  reviewCount: S.Number,
  dueToday: S.Number,
  retentionRate: S.Number, // 0-1
  streak: S.Number, // Days in a row with reviews
}) {}
