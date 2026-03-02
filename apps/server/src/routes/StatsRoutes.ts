import { HttpApiBuilder } from "@effect/platform"
import { Effect, Option } from "effect"
import { DatabaseService, DeckService, ReviewService } from "@serious/core"
import { SeriousApi, AggregateStats, RetentionDataPoint } from "@serious/api"

export const StatsRoutesLive = HttpApiBuilder.group(SeriousApi, "stats", (handlers) =>
  handlers
    .handle("aggregate", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        const db = yield* DatabaseService
        const decks = yield* deckService.getAll()

        let totalCards = 0
        let totalDue = 0
        let totalNew = 0
        let currentStreak = 0
        let totalRetention = 0
        let deckCount = 0

        for (const deck of decks) {
          const stats = yield* deckService.getStats(deck.id).pipe(Effect.orDie)
          totalCards += stats.totalCards
          totalDue += stats.dueToday
          totalNew += stats.newCount
          totalRetention += stats.retentionRate
          deckCount++

          if (stats.streak > currentStreak) {
            currentStreak = stats.streak
          }
        }

        // Persist longest streak in settings
        const storedLongest = yield* db.getSetting("longestStreak").pipe(
          Effect.map(Option.map((v) => parseInt(v, 10))),
          Effect.map(Option.getOrElse(() => 0)),
        )
        const longestStreak = Math.max(currentStreak, storedLongest)
        if (longestStreak > storedLongest) {
          yield* db.setSetting("longestStreak", String(longestStreak))
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

        const fromStr = from.toISOString().split("T")[0]!
        const toStr = to.toISOString().split("T")[0]!
        return yield* reviewService.getDailyProgressRange(fromStr, toStr)
      })
    )
    .handle("retention", ({ urlParams }) =>
      Effect.gen(function* () {
        const reviewService = yield* ReviewService
        const days = urlParams.days ?? 30

        const to = new Date()
        const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)

        const fromStr = from.toISOString().split("T")[0]!
        const toStr = to.toISOString().split("T")[0]!
        const dailyProgress = yield* reviewService.getDailyProgressRange(fromStr, toStr)

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
