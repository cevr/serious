import { Schema as S } from "effect"
import { CardIdSchema, DeckIdSchema } from "./ids"

// Card types aligned with Fluent Forever methodology
export const CardType = S.Literal(
  "basic", // Simple front/back vocabulary
  "minimal-pair", // Audio-based pronunciation training
  "cloze", // Fill-in-the-blank for grammar
  "image-word", // Image -> target language word (no translation)
  "ipa", // IPA phonetic symbols
  "spelling" // Spelling pattern cards
)
export type CardType = S.Schema.Type<typeof CardType>

// FSRS card states
export const CardState = S.Literal("new", "learning", "review", "relearning")
export type CardState = S.Schema.Type<typeof CardState>

// Rating for reviews (FSRS standard)
export const Rating = S.Literal(1, 2, 3, 4) // Again, Hard, Good, Easy
export type Rating = S.Schema.Type<typeof Rating>

// Card schema using Schema.Class for proper Effect integration
export class Card extends S.Class<Card>("Card")({
  id: CardIdSchema,
  deckId: DeckIdSchema,
  type: CardType,

  // FSRS scheduling fields
  due: S.Date,
  stability: S.Number,
  difficulty: S.Number,
  reps: S.Number,
  lapses: S.Number,
  state: CardState,
  lastReview: S.NullOr(S.Date),

  // Content (stored as JSON strings for flexibility)
  front: S.String,
  back: S.String,

  // Optional media references
  audioFront: S.NullOr(S.String),
  audioBack: S.NullOr(S.String),
  image: S.NullOr(S.String),

  // Fluent Forever: personal connections make memories stronger
  personalNote: S.NullOr(S.String),

  // Organization
  tags: S.Array(S.String),
  createdAt: S.Date,
}) {}

// Create card input (without FSRS fields which are set by the scheduler)
export class CreateCardInput extends S.Class<CreateCardInput>("CreateCardInput")({
  deckId: DeckIdSchema,
  type: CardType,
  front: S.String,
  back: S.String,
  audioFront: S.optional(S.String),
  audioBack: S.optional(S.String),
  image: S.optional(S.String),
  personalNote: S.optional(S.String),
  tags: S.optional(S.Array(S.String)),
}) {}
