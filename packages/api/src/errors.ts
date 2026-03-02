import { Schema as S } from "effect"

// API error schemas for HTTP responses
export class DeckNotFoundError extends S.TaggedError<DeckNotFoundError>()(
  "DeckNotFoundError",
  {
    deckId: S.String,
    message: S.String,
  }
) {}

export class CardNotFoundError extends S.TaggedError<CardNotFoundError>()(
  "CardNotFoundError",
  {
    cardId: S.String,
    message: S.String,
  }
) {}

export class ValidationError extends S.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: S.String,
    field: S.optional(S.String),
  }
) {}
