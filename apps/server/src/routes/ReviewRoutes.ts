import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { ReviewService, CardService, DeckService } from "@serious/core"
import { SeriousApi, CardNotFoundError, DeckNotFoundError, ReviewResult } from "@serious/api"
import type { CardId, DeckId } from "@serious/shared"

export const ReviewRoutesLive = HttpApiBuilder.group(SeriousApi, "reviews", (handlers) =>
  handlers
    .handle("getDue", ({ path, urlParams }) =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        const deckService = yield* DeckService

        // Verify deck exists
        yield* deckService.get(path.deckId as DeckId).pipe(
          Effect.mapError(
            () =>
              new DeckNotFoundError({
                deckId: path.deckId,
                message: `Deck with id ${path.deckId} not found`,
              })
          )
        )

        const limit = urlParams.limit ?? 20
        return yield* reviewService.getDueCards(path.deckId as DeckId, limit)
      })
    )
    .handle("submit", ({ path, payload }) =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService

        // submitReview already checks card existence and returns the updated card
        const result = yield* reviewService.submitReview(path.cardId as CardId, payload.rating).pipe(
          Effect.mapError(
            () =>
              new CardNotFoundError({
                cardId: path.cardId,
                message: `Card with id ${path.cardId} not found`,
              })
          )
        )

        return new ReviewResult({
          card: result.card,
          scheduledDays: result.scheduledDays,
          elapsedDays: result.elapsedDays,
          nextDue: result.card.due,
        })
      })
    )
    .handle("history", ({ path }) =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        const cardService = yield* CardService

        // Verify card exists
        yield* cardService.get(path.cardId as CardId).pipe(
          Effect.mapError(
            () =>
              new CardNotFoundError({
                cardId: path.cardId,
                message: `Card with id ${path.cardId} not found`,
              })
          )
        )

        return yield* reviewService.getHistory(path.cardId as CardId)
      })
    )
)
