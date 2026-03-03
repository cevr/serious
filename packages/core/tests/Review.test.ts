import { Effect } from "effect"
import { describe, expect, it } from "effect-bun-test/v3"
import {
  Card,
  CardId,
  DeckId,
  SessionStats,
  type Rating,
} from "@serious/shared"
import { ReviewService } from "../src/services/Review"

describe("ReviewService", () => {
  const TestLayer = ReviewService.Test

  describe("getDueCards", () => {
    it.effect("returns cards due for review", () =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        const deckId = DeckId.make("deck-1")

        const dueCards = yield* reviewService.getDueCards(deckId)

        expect(dueCards).toHaveLength(0)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("submitReview", () => {
    it.effect("submits a review and returns scheduled card", () =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        const cardId = CardId.make("card-1")

        const result = yield* reviewService.submitReview(cardId, 3)

        expect(result.card.id).toBe(cardId)
        expect(result.scheduledDays).toBeGreaterThan(0)
        expect(result.elapsedDays).toBe(0)
      }).pipe(Effect.provide(TestLayer))
    )

    it.effect("returns scheduled card for all valid ratings", () =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        const cardId = CardId.make("card-1")

        for (const rating of [1, 2, 3, 4] as Rating[]) {
          const result = yield* reviewService.submitReview(cardId, rating)
          expect(result.card).toBeInstanceOf(Card)
          expect(result.scheduledDays).toBeGreaterThanOrEqual(0)
        }
      }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("getHistory", () => {
    it.effect("returns review history for a card", () =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        const cardId = CardId.make("card-1")

        const history = yield* reviewService.getHistory(cardId)

        expect(history).toHaveLength(0)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("getDailyProgressRange", () => {
    it.effect("returns daily progress for date range", () =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService

        const progress = yield* reviewService.getDailyProgressRange("2024-01-01", "2024-01-31")

        expect(progress).toHaveLength(0)
      }).pipe(Effect.provide(TestLayer))
    )
  })

  describe("recordSession", () => {
    it.effect("records session stats", () =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService

        const stats = new SessionStats({
          reviewed: 10,
          correct: 8,
          wrong: 2,
          newCards: 3,
          timeSpentSeconds: 120,
          startedAt: new Date(),
          endedAt: new Date(),
        })

        yield* reviewService.recordSession(stats)
      }).pipe(Effect.provide(TestLayer))
    )
  })
})
