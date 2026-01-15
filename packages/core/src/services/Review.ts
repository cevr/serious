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

export interface ReviewService {
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
   * Record session stats to daily progress
   */
  readonly recordSession: (stats: SessionStats) => Effect.Effect<void>
}

export class ReviewService extends Context.Tag("ReviewService")<
  ReviewService,
  ReviewService
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

            // Update the card
            yield* db.updateCard(scheduled.card)

            // Log the review
            const log = new ReviewLog({
              id: ReviewLogId.generate(),
              cardId,
              rating,
              state: card.state,
              scheduledDays: scheduled.scheduledDays,
              elapsedDays: scheduled.elapsedDays,
              reviewedAt: now,
            })
            yield* db.insertReviewLog(log)

            return scheduled
          }),

        getHistory: (cardId) => db.getReviewLogs(cardId),

        recordSession: (stats) =>
          Effect.gen(function* () {
            const today = new Date().toISOString().split("T")[0]!
            yield* db.upsertDailyProgress({
              date: today,
              newCards: 0, // TODO: Track new cards separately
              reviews: stats.reviewed,
              correctReviews: stats.correct,
              timeSpentSeconds: stats.timeSpentSeconds,
            })
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
      recordSession: () => Effect.void,
    })
  )
}
