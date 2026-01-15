import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema as S } from "effect"
import { DailyProgress } from "@serious/shared"

// Aggregate statistics across all decks
export class AggregateStats extends S.Class<AggregateStats>("AggregateStats")({
  totalCards: S.Number,
  totalDue: S.Number,
  totalNew: S.Number,
  deckCount: S.Number,
  overallRetention: S.Number, // 0-1
  currentStreak: S.Number,
  longestStreak: S.Number,
}) {}

// Retention data point for charts
export class RetentionDataPoint extends S.Class<RetentionDataPoint>("RetentionDataPoint")({
  date: S.String, // YYYY-MM-DD
  retention: S.Number, // 0-1
  reviews: S.Number,
}) {}

// Query params for daily stats
export const DailyStatsParams = S.Struct({
  from: S.optional(S.String), // YYYY-MM-DD
  to: S.optional(S.String), // YYYY-MM-DD
})

// Query params for retention stats
export const RetentionStatsParams = S.Struct({
  days: S.optional(S.NumberFromString), // Default 30
})

export const StatsApiGroup = HttpApiGroup.make("stats")
  .add(
    HttpApiEndpoint.get("aggregate", "/stats")
      .addSuccess(AggregateStats)
  )
  .add(
    HttpApiEndpoint.get("daily", "/stats/daily")
      .setUrlParams(DailyStatsParams)
      .addSuccess(S.Array(DailyProgress))
  )
  .add(
    HttpApiEndpoint.get("retention", "/stats/retention")
      .setUrlParams(RetentionStatsParams)
      .addSuccess(S.Array(RetentionDataPoint))
  )
