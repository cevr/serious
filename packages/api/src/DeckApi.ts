import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema as S } from "effect"
import { Deck, DeckIdSchema, DeckStats, CreateDeckInput } from "@serious/shared"
import { DeckNotFoundError, ValidationError } from "./errors"

// Partial update input for deck
export const UpdateDeckInput = S.Struct({
  name: S.optional(S.String),
  description: S.optional(S.NullOr(S.String)),
  newCardsPerDay: S.optional(S.Number),
  reviewsPerDay: S.optional(S.Number),
})

export const DeckApiGroup = HttpApiGroup.make("decks")
  .add(
    HttpApiEndpoint.get("list", "/decks")
      .addSuccess(S.Array(Deck))
  )
  .add(
    HttpApiEndpoint.get("get", "/decks/:deckId")
      .setPath(S.Struct({ deckId: DeckIdSchema }))
      .addSuccess(Deck)
      .addError(DeckNotFoundError, { status: 404 })
  )
  .add(
    HttpApiEndpoint.get("stats", "/decks/:deckId/stats")
      .setPath(S.Struct({ deckId: DeckIdSchema }))
      .addSuccess(DeckStats)
      .addError(DeckNotFoundError, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("create", "/decks")
      .setPayload(CreateDeckInput)
      .addSuccess(Deck, { status: 201 })
      .addError(ValidationError, { status: 400 })
  )
  .add(
    HttpApiEndpoint.patch("update", "/decks/:deckId")
      .setPath(S.Struct({ deckId: DeckIdSchema }))
      .setPayload(UpdateDeckInput)
      .addSuccess(Deck)
      .addError(DeckNotFoundError, { status: 404 })
      .addError(ValidationError, { status: 400 })
  )
  .add(
    HttpApiEndpoint.del("delete", "/decks/:deckId")
      .setPath(S.Struct({ deckId: DeckIdSchema }))
      .addSuccess(S.Void)
      .addError(DeckNotFoundError, { status: 404 })
  )
