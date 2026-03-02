import { Clock, Context, Effect, Layer } from "effect"
import {
  Card,
  type CardId,
  DailyProgress,
  DeckId,
  type Rating,
  ReviewLog,
  ReviewLogId,
  SessionStats,
} from "@serious/shared"
import { DatabaseService } from "../storage/Database"
import { FsrsService, type ScheduledCard } from "./Fsrs"
import { CardService } from "./Card"
import { DeckService } from "./Deck"
import { CardNotFound } from "../errors"

export interface ReviewServiceShape {
  /**
   * Get cards due for review in a deck
   */
  readonly getDueCards: (
    deckId: DeckId,
    limit: number
  ) => Effect.Effect<readonly Card[]>

  /**
   * Submit a review for a card
   */
  readonly submitReview: (
    cardId: CardId,
    rating: Rating
  ) => Effect.Effect<ScheduledCard, CardNotFound>

  /**
   * Get review history for a card
   */
  readonly getHistory: (cardId: CardId) => Effect.Effect<readonly ReviewLog[]>

  /**
   * Get daily progress for a date range
   */
  readonly getDailyProgressRange: (
    from: string,
    to: string
  ) => Effect.Effect<readonly DailyProgress[]>

  /**
   * Record session stats to daily progress
   */
  readonly recordSession: (stats: SessionStats) => Effect.Effect<void>
}

export class ReviewService extends Context.Tag("ReviewService")<
  ReviewService,
  ReviewServiceShape
>() {
  static Live = Layer.effect(
    ReviewService,
    Effect.gen(function* () {
      const db = yield* DatabaseService
      const fsrs = yield* FsrsService
      const cardService = yield* CardService
      const deckService = yield* DeckService

      return ReviewService.of({
        getDueCards: (deckId, limit) =>
          Effect.gen(function* () {
            const now = new Date(yield* Clock.currentTimeMillis)
            const todayStr = now.toISOString().split("T")[0]!

            // Fetch all due cards (over-fetch, then filter by limits)
            const allDue = yield* db.getDueCards(deckId, limit, now)

            // Get deck settings for daily limits
            const deck = yield* deckService.get(deckId).pipe(
              Effect.catchAll(() => Effect.succeed(null))
            )
            if (!deck) return allDue

            const newCardsPerDay = deck.newCardsPerDay
            const reviewsPerDay = deck.reviewsPerDay

            // Count new cards already introduced today
            const newCardsToday = yield* db.countNewCardsIntroducedToday(deckId, todayStr)

            // Partition due cards by category
            const learning: Card[] = []
            const review: Card[] = []
            const newCards: Card[] = []

            for (const card of allDue) {
              if (card.state === "learning" || card.state === "relearning") {
                learning.push(card)
              } else if (card.state === "review") {
                review.push(card)
              } else if (card.state === "new") {
                newCards.push(card)
              }
            }

            // Learning/relearning cards always come first (no limit — intra-day steps)
            const result: Card[] = [...learning]

            // Then review cards up to reviewsPerDay
            const reviewSlots = Math.max(0, reviewsPerDay - learning.length)
            result.push(...review.slice(0, reviewSlots))

            // Then new cards up to remaining newCardsPerDay
            const newSlots = Math.max(0, newCardsPerDay - newCardsToday)
            result.push(...newCards.slice(0, newSlots))

            return result.slice(0, limit)
          }),

        submitReview: (cardId, rating) =>
          Effect.gen(function* () {
            const card = yield* cardService.get(cardId)
            const now = new Date(yield* Clock.currentTimeMillis)

            // Schedule the card
            const scheduled = yield* fsrs.schedule(card, rating, now)

            // Build the review log
            const log = new ReviewLog({
              id: ReviewLogId.generate(),
              cardId,
              rating,
              state: card.state,
              scheduledDays: scheduled.scheduledDays,
              elapsedDays: scheduled.elapsedDays,
              reviewedAt: now,
            })

            // Update card + insert log atomically
            yield* db.transaction(() => {
              Effect.runSync(db.updateCard(scheduled.card))
              Effect.runSync(db.insertReviewLog(log))
            })

            return scheduled
          }),

        getHistory: (cardId) => db.getReviewLogs(cardId),

        getDailyProgressRange: (from, to) => db.getDailyProgressRange(from, to),

        recordSession: (stats) =>
          Effect.gen(function* () {
            const today = new Date(yield* Clock.currentTimeMillis).toISOString().split("T")[0]!
            yield* db.upsertDailyProgress(
              new DailyProgress({
                date: today,
                newCards: stats.newCards,
                reviews: stats.reviewed,
                correctReviews: stats.correct,
                timeSpentSeconds: stats.timeSpentSeconds,
              })
            )
          }),
      })
    })
  )

  static Test = Layer.succeed(
    ReviewService,
    ReviewService.of({
      getDueCards: () => Effect.succeed([]),
      submitReview: (cardId) =>
        Effect.succeed({
          card: new Card({
            id: cardId,
            deckId: DeckId.make("test-deck"),
            type: "basic",
            due: new Date(),
            stability: 1,
            difficulty: 5,
            reps: 1,
            lapses: 0,
            state: "review",
            lastReview: new Date(),
            front: "test",
            back: "test",
            audioFront: null,
            audioBack: null,
            image: null,
            personalNote: null,
            tags: [],
            createdAt: new Date(),
          }),
          scheduledDays: 1,
          elapsedDays: 0,
        }),
      getHistory: () => Effect.succeed([]),
      getDailyProgressRange: () => Effect.succeed([]),
      recordSession: () => Effect.void,
    })
  )
}
