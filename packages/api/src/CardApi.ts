import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema as S } from "effect"
import { Card, CreateCardInput, CardState } from "@serious/shared"
import { CardNotFoundError, DeckNotFoundError, ValidationError } from "./errors"

// Paginated response for cards
export class PaginatedCards extends S.Class<PaginatedCards>("PaginatedCards")({
  cards: S.Array(Card),
  total: S.Number,
  page: S.Number,
  pageSize: S.Number,
  hasMore: S.Boolean,
}) {}

// Query params for listing cards
export const ListCardsParams = S.Struct({
  state: S.optional(CardState),
  search: S.optional(S.String),
  tags: S.optional(S.String), // comma-separated
  page: S.optional(S.NumberFromString),
  pageSize: S.optional(S.NumberFromString),
})

// Partial update input for card
export const UpdateCardInput = S.Struct({
  front: S.optional(S.String),
  back: S.optional(S.String),
  audioFront: S.optional(S.NullOr(S.String)),
  audioBack: S.optional(S.NullOr(S.String)),
  image: S.optional(S.NullOr(S.String)),
  personalNote: S.optional(S.NullOr(S.String)),
  tags: S.optional(S.Array(S.String)),
})

export const CardApiGroup = HttpApiGroup.make("cards")
  .add(
    HttpApiEndpoint.get("listByDeck", "/decks/:deckId/cards")
      .setPath(S.Struct({ deckId: S.String }))
      .setUrlParams(ListCardsParams)
      .addSuccess(PaginatedCards)
      .addError(DeckNotFoundError, { status: 404 })
  )
  .add(
    HttpApiEndpoint.get("get", "/cards/:cardId")
      .setPath(S.Struct({ cardId: S.String }))
      .addSuccess(Card)
      .addError(CardNotFoundError, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("create", "/decks/:deckId/cards")
      .setPath(S.Struct({ deckId: S.String }))
      .setPayload(S.Struct({
        type: S.optional(S.Literal("basic", "minimal-pair", "cloze", "image-word", "ipa", "spelling")),
        front: S.String,
        back: S.String,
        audioFront: S.optional(S.String),
        audioBack: S.optional(S.String),
        image: S.optional(S.String),
        personalNote: S.optional(S.String),
        tags: S.optional(S.Array(S.String)),
      }))
      .addSuccess(Card, { status: 201 })
      .addError(DeckNotFoundError, { status: 404 })
      .addError(ValidationError, { status: 400 })
  )
  .add(
    HttpApiEndpoint.patch("update", "/cards/:cardId")
      .setPath(S.Struct({ cardId: S.String }))
      .setPayload(UpdateCardInput)
      .addSuccess(Card)
      .addError(CardNotFoundError, { status: 404 })
      .addError(ValidationError, { status: 400 })
  )
  .add(
    HttpApiEndpoint.del("delete", "/cards/:cardId")
      .setPath(S.Struct({ cardId: S.String }))
      .addSuccess(S.Void)
      .addError(CardNotFoundError, { status: 404 })
  )
