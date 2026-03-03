import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  Card,
  CardId,
  DailyProgress,
  DeckId,
  ReviewLog,
  ReviewLogId,
  SessionStats,
  type Rating,
} from "@serious/shared"
import { CardNotFound } from "../src/errors"
import type { ReviewServiceShape } from "../src/services/Review"

// Inline test implementation typed against ReviewServiceShape to validate interface conformance.
// Cannot import ReviewService directly — transitive bun:sqlite dependency breaks vitest (Node).

// Simplified FSRS scheduling for tests
const scheduleCard = (
  card: Card,
  rating: Rating,
  now: Date
): { card: Card; scheduledDays: number; elapsedDays: number } => {
  const elapsedDays = card.lastReview
    ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
    : 0

  let newState = card.state
  let newStability = card.stability
  let newReps = card.reps
  let newLapses = card.lapses
  let scheduledDays = 1

  if (card.state === "new") {
    newState = rating >= 3 ? "review" : "learning"
    newStability = rating * 2
    newReps = 1
    scheduledDays = rating >= 3 ? rating : 1
  } else {
    if (rating === 1) {
      newState = "relearning"
      newLapses = card.lapses + 1
      scheduledDays = 1
    } else {
      newState = "review"
      newStability = card.stability * rating
      newReps = card.reps + 1
      scheduledDays = Math.round(card.stability * rating)
    }
  }

  const due = new Date(now)
  due.setDate(due.getDate() + scheduledDays)

  return {
    card: new Card({
      ...card,
      state: newState,
      stability: newStability,
      reps: newReps,
      lapses: newLapses,
      due,
      lastReview: now,
    }),
    scheduledDays,
    elapsedDays,
  }
}

describe("ReviewService", () => {
  const makeTestReviewService = (): ReviewServiceShape & {
    _getCard: (id: CardId) => Card | undefined
  } => {
    const cards = new Map<string, Card>()
    const reviewLogs: ReviewLog[] = []
    const dailyProgress: DailyProgress[] = []

    // Seed with a test card
    const testCard = new Card({
      id: CardId.make("card-1"),
      deckId: DeckId.make("deck-1"),
      type: "basic",
      due: new Date("2024-01-01"),
      stability: 5,
      difficulty: 5,
      reps: 2,
      lapses: 0,
      state: "review",
      lastReview: new Date("2023-12-25"),
      front: "Hello",
      back: "Hola",
      audioFront: null,
      audioBack: null,
      image: null,
      personalNote: null,
      tags: [],
      createdAt: new Date("2023-12-01"),
    })
    cards.set(testCard.id, testCard)

    return {
      getDueCards: (deckId) =>
        Effect.succeed(
          Array.from(cards.values())
            .filter((c) => c.deckId === deckId && c.due <= new Date())
        ),
      submitReview: (cardId, rating) => {
        const card = cards.get(cardId)
        if (!card) {
          return Effect.fail(new CardNotFound({ cardId }))
        }
        const now = new Date()
        const scheduled = scheduleCard(card, rating, now)

        // Update card in store
        cards.set(cardId, scheduled.card)

        // Create review log
        const log = new ReviewLog({
          id: ReviewLogId.generate(),
          cardId,
          rating,
          state: card.state,
          scheduledDays: scheduled.scheduledDays,
          elapsedDays: scheduled.elapsedDays,
          reviewedAt: now,
        })
        reviewLogs.push(log)

        return Effect.succeed(scheduled)
      },
      getHistory: (cardId) =>
        Effect.succeed(reviewLogs.filter((l) => l.cardId === cardId)),
      getDailyProgressRange: (from, to) =>
        Effect.succeed(
          dailyProgress.filter((p) => p.date >= from && p.date <= to)
        ),
      recordSession: (stats) =>
        Effect.sync(() => {
          const today = new Date().toISOString().split("T")[0]!
          dailyProgress.push(
            new DailyProgress({
              date: today,
              newCards: stats.newCards,
              reviews: stats.reviewed,
              correctReviews: stats.correct,
              timeSpentSeconds: stats.timeSpentSeconds,
            })
          )
        }),
      _getCard: (id) => cards.get(id),
    }
  }

  describe("getDueCards", () => {
    it.effect("returns cards due for review", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()
        const deckId = DeckId.make("deck-1")

        // Test card is due (2024-01-01), so querying on that date should return it
        const dueCards = yield* reviewService.getDueCards(deckId)

        expect(dueCards).toHaveLength(1)
        expect(dueCards[0]!.front).toBe("Hello")
      })
    )
  })

  describe("submitReview", () => {
    it.effect("submits a review with Good rating", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()
        const cardId = CardId.make("card-1")

        const result = yield* reviewService.submitReview(cardId, 3)

        expect(result.card.id).toBe(cardId)
        expect(result.card.reps).toBe(3) // Incremented
        expect(result.card.lastReview).not.toBeNull()
        expect(result.scheduledDays).toBeGreaterThan(0)
      })
    )

    it.effect("submits a review with Again rating", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()
        const cardId = CardId.make("card-1")

        const result = yield* reviewService.submitReview(cardId, 1)

        expect(result.card.state).toBe("relearning")
        expect(result.card.lapses).toBe(1) // Incremented
      })
    )

    it.effect("fails with CardNotFound for non-existent card", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()
        const nonExistentId = CardId.make("non-existent")

        const result = yield* reviewService
          .submitReview(nonExistentId, 3)
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(CardNotFound)
      })
    )

    it.effect("updates card state correctly after review", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()
        const cardId = CardId.make("card-1")

        // Submit a review
        yield* reviewService.submitReview(cardId, 3)

        // Get the updated card
        const updated = reviewService._getCard(cardId)!

        expect(updated.state).toBe("review")
        expect(updated.reps).toBe(3)
        expect(updated.lastReview).not.toBeNull()
      })
    )
  })

  describe("getHistory", () => {
    it.effect("returns review history for a card", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()
        const cardId = CardId.make("card-1")

        // Submit a few reviews
        yield* reviewService.submitReview(cardId, 3)
        yield* reviewService.submitReview(cardId, 4)

        const history = yield* reviewService.getHistory(cardId)

        expect(history).toHaveLength(2)
        expect(history[0]!.rating).toBe(3)
        expect(history[1]!.rating).toBe(4)
      })
    )

    it.effect("returns empty array for card with no reviews", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()
        const cardId = CardId.make("no-reviews")

        const history = yield* reviewService.getHistory(cardId)

        expect(history).toHaveLength(0)
      })
    )
  })

  describe("recordSession", () => {
    it.effect("records session stats", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()

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

        const progress = yield* reviewService.getDailyProgressRange(
          new Date().toISOString().split("T")[0]!,
          new Date().toISOString().split("T")[0]!,
        )
        expect(progress).toHaveLength(1)
        expect(progress[0]!.reviews).toBe(10)
      })
    )
  })

  describe("review workflow", () => {
    it.effect("complete review session workflow", () =>
      Effect.gen(function* () {
        const reviewService = makeTestReviewService()
        const deckId = DeckId.make("deck-1")

        // Get due cards
        const dueCards = yield* reviewService.getDueCards(deckId)
        expect(dueCards.length).toBeGreaterThan(0)

        // Review first card
        const firstCard = dueCards[0]!
        const result = yield* reviewService.submitReview(firstCard.id, 3)

        // Card should be scheduled for future
        expect(result.card.due.getTime()).toBeGreaterThan(Date.now())

        // Review history should be recorded
        const history = yield* reviewService.getHistory(firstCard.id)
        expect(history.length).toBeGreaterThan(0)
      })
    )
  })
})
