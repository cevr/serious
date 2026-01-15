import { Schema as S } from "effect"
import { CardIdSchema, ReviewLogIdSchema } from "./ids"
import { CardState, Rating } from "./card"

// Review log entry - records each review for analytics
export class ReviewLog extends S.Class<ReviewLog>("ReviewLog")({
  id: ReviewLogIdSchema,
  cardId: CardIdSchema,
  rating: Rating,
  state: CardState, // State before review
  scheduledDays: S.Number, // Days until next review
  elapsedDays: S.Number, // Days since last review
  reviewedAt: S.Date,
}) {}

// Session statistics
export class SessionStats extends S.Class<SessionStats>("SessionStats")({
  reviewed: S.Number,
  correct: S.Number, // Rating >= 3 (Good or Easy)
  wrong: S.Number, // Rating < 3 (Again or Hard)
  timeSpentSeconds: S.Number,
  startedAt: S.Date,
  endedAt: S.NullOr(S.Date),
}) {}

// Daily progress for streak tracking
export class DailyProgress extends S.Class<DailyProgress>("DailyProgress")({
  date: S.String, // YYYY-MM-DD
  newCards: S.Number,
  reviews: S.Number,
  correctReviews: S.Number,
  timeSpentSeconds: S.Number,
}) {}
