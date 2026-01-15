import { Schema as S } from "effect"

export class CardNotFound extends S.TaggedError<CardNotFound>()("CardNotFound", {
  cardId: S.String,
}) {}

export class DeckNotFound extends S.TaggedError<DeckNotFound>()("DeckNotFound", {
  deckId: S.String,
}) {}

export class ImportError extends S.TaggedError<ImportError>()("ImportError", {
  message: S.String,
  path: S.optional(S.String),
}) {}

export class AudioError extends S.TaggedError<AudioError>()("AudioError", {
  message: S.String,
}) {}

export class DatabaseError extends S.TaggedError<DatabaseError>()("DatabaseError", {
  message: S.String,
  cause: S.optional(S.Unknown),
}) {}
