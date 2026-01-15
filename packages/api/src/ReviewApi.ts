import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema as S } from "effect"
import { Card, Rating, ReviewLog } from "@serious/shared"
import { CardNotFoundError, DeckNotFoundError } from "./errors"

// Response after submitting a review
export class ReviewResult extends S.Class<ReviewResult>("ReviewResult")({
  card: Card,
  scheduledDays: S.Number,
  elapsedDays: S.Number,
  nextDue: S.Date,
}) {}

// Request body for submitting a review
export const SubmitReviewInput = S.Struct({
  rating: Rating,
})

// Query params for getting due cards
export const GetDueCardsParams = S.Struct({
  limit: S.optional(S.NumberFromString),
})

export const ReviewApiGroup = HttpApiGroup.make("reviews")
  .add(
    HttpApiEndpoint.get("getDue", "/decks/:deckId/due")
      .setPath(S.Struct({ deckId: S.String }))
      .setUrlParams(GetDueCardsParams)
      .addSuccess(S.Array(Card))
      .addError(DeckNotFoundError, { status: 404 })
  )
  .add(
    HttpApiEndpoint.post("submit", "/cards/:cardId/review")
      .setPath(S.Struct({ cardId: S.String }))
      .setPayload(SubmitReviewInput)
      .addSuccess(ReviewResult)
      .addError(CardNotFoundError, { status: 404 })
  )
  .add(
    HttpApiEndpoint.get("history", "/cards/:cardId/history")
      .setPath(S.Struct({ cardId: S.String }))
      .addSuccess(S.Array(ReviewLog))
      .addError(CardNotFoundError, { status: 404 })
  )
