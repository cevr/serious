import { HttpApi } from "@effect/platform"
import { DeckApiGroup, UpdateDeckInput } from "./DeckApi"
import { CardApiGroup, PaginatedCards, ListCardsParams, UpdateCardInput } from "./CardApi"
import { ReviewApiGroup, ReviewResult, SubmitReviewInput, GetDueCardsParams } from "./ReviewApi"
import { StatsApiGroup, AggregateStats, RetentionDataPoint, DailyStatsParams, RetentionStatsParams } from "./StatsApi"

// Compose all API groups into a single API definition
export const SeriousApi = HttpApi.make("serious")
  .add(DeckApiGroup)
  .add(CardApiGroup)
  .add(ReviewApiGroup)
  .add(StatsApiGroup)

// Re-export all types
export * from "./errors"
export { DeckApiGroup, UpdateDeckInput } from "./DeckApi"
export { CardApiGroup, PaginatedCards, ListCardsParams, UpdateCardInput } from "./CardApi"
export { ReviewApiGroup, ReviewResult, SubmitReviewInput, GetDueCardsParams } from "./ReviewApi"
export { StatsApiGroup, AggregateStats, RetentionDataPoint, DailyStatsParams, RetentionStatsParams } from "./StatsApi"
