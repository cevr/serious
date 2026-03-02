import { Context, Effect, Layer } from "effect"
import {
  Card,
  type CardId,
  DailyProgress,
  type DeckId,
  type Rating,
  ReviewLog,
  ReviewLogId,
  SessionStats,
} from "@serious/shared"
import { DatabaseService } from "../storage/Database"
import { FsrsService, type ScheduledCard } from "./Fsrs"
import { CardService } from "./Card"
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

      return ReviewService.of({
        getDueCards: (deckId, limit) => db.getDueCards(deckId, limit, new Date()),

        submitReview: (cardId, rating) =>
          Effect.gen(function* () {
            const card = yield* cardService.get(cardId)
            const now = new Date()

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
            const today = new Date().toISOString().split("T")[0]!
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
      submitReview: () =>
        Effect.succeed({
          card: {} as Card,
          scheduledDays: 1,
          elapsedDays: 0,
        }),
      getHistory: () => Effect.succeed([]),
      getDailyProgressRange: () => Effect.succeed([]),
      recordSession: () => Effect.void,
    })
  )
}
