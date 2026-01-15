import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { DeckService, ReviewService } from "@serious/core"
import { SeriousApi, AggregateStats, RetentionDataPoint } from "@serious/api"

export const StatsRoutesLive = HttpApiBuilder.group(SeriousApi, "stats", (handlers) =>
  handlers
    .handle("aggregate", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        const decks = yield* deckService.getAll()

        let totalCards = 0
        let totalDue = 0
        let totalNew = 0
        let currentStreak = 0
        let longestStreak = 0
        let totalRetention = 0
        let deckCount = 0

        for (const deck of decks) {
          const stats = yield* deckService.getStats(deck.id)
          totalCards += stats.totalCards
          totalDue += stats.dueToday
          totalNew += stats.newCount
          totalRetention += stats.retentionRate
          deckCount++

          if (stats.streak > currentStreak) {
            currentStreak = stats.streak
          }
          if (stats.streak > longestStreak) {
            longestStreak = stats.streak
          }
        }

        return new AggregateStats({
          totalCards,
          totalDue,
          totalNew,
          deckCount,
          overallRetention: deckCount > 0 ? totalRetention / deckCount : 0,
          currentStreak,
          longestStreak,
        })
      })
    )
    .handle("daily", ({ urlParams }) =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        
        // Calculate date range
        const to = urlParams.to ? new Date(urlParams.to) : new Date()
        const from = urlParams.from
          ? new Date(urlParams.from)
          : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000) // Default 30 days

        return yield* reviewService.getDailyProgress(from, to)
      })
    )
    .handle("retention", ({ urlParams }) =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        const days = urlParams.days ?? 30
        
        const to = new Date()
        const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)

        const dailyProgress = yield* reviewService.getDailyProgress(from, to)

        return dailyProgress.map(
          (day) =>
            new RetentionDataPoint({
              date: day.date,
              retention: day.reviews > 0 ? day.correctReviews / day.reviews : 0,
              reviews: day.reviews,
            })
        )
      })
    )
)
