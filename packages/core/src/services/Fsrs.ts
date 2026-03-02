import { Context, Effect, Layer, Random } from "effect"
import {
  Card,
  CardId,
  type CardState,
  type CardType,
  type DeckId,
  type Rating,
} from "@serious/shared"

// FSRS-6 algorithm parameters (default values)
const DEFAULT_WEIGHTS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
]

const DEFAULT_RETENTION = 0.9
const MAX_INTERVAL = 36500 // 100 years in days

export interface ScheduledCard {
  card: Card
  scheduledDays: number
  elapsedDays: number
}

export interface FsrsServiceShape {
  /**
   * Schedule a card based on the user's rating
   */
  readonly schedule: (
    card: Card,
    rating: Rating,
    now: Date
  ) => Effect.Effect<ScheduledCard>

  /**
   * Create a new card with initial FSRS values
   */
  readonly createNew: (
    deckId: DeckId,
    type: CardType,
    front: string,
    back: string
  ) => Effect.Effect<Card>

  /**
   * Calculate retrievability (probability of recall) at a given time
   */
  readonly retrievability: (card: Card, now: Date) => Effect.Effect<number>
}

export class FsrsService extends Context.Tag("FsrsService")<
  FsrsService,
  FsrsServiceShape
>() {
  static Live = Layer.succeed(
    FsrsService,
    FsrsService.of({
      schedule: (card, rating, now) =>
        Effect.gen(function* () {
          const elapsedDays = card.lastReview
            ? (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)
            : 0

          let newState: CardState = card.state
          let newStability = card.stability
          let newDifficulty = card.difficulty
          let newReps = card.reps
          let newLapses = card.lapses
          let scheduledDays: number

          if (card.state === "new") {
            // First review - initialize FSRS parameters
            const result = initializeCard(rating)
            newState = result.state
            newStability = result.stability
            newDifficulty = result.difficulty
            newReps = 1
            scheduledDays = result.interval
          } else {
            // Subsequent review
            const retrievability = calculateRetrievability(
              card.stability,
              elapsedDays
            )

            if (rating === 1) {
              // Again - card forgotten
              newLapses = card.lapses + 1
              newState = "relearning"
              newStability = calculateStabilityAfterForget(
                card.difficulty,
                card.stability,
                retrievability
              )
              scheduledDays = 1 // Review again tomorrow
            } else {
              // Hard, Good, or Easy - card remembered
              newState = "review"
              newDifficulty = updateDifficulty(card.difficulty, rating)
              newStability = calculateStabilityAfterSuccess(
                card.difficulty,
                card.stability,
                retrievability,
                rating
              )
              newReps = card.reps + 1
              scheduledDays = calculateInterval(newStability, DEFAULT_RETENTION)
            }
          }

          // Apply fuzz to interval to prevent cards from clustering
          scheduledDays = yield* applyFuzz(scheduledDays)

          // Cap interval at maximum
          scheduledDays = Math.min(scheduledDays, MAX_INTERVAL)

          const due = new Date(now)
          due.setDate(due.getDate() + Math.round(scheduledDays))

          const newCard = new Card({
            ...card,
            state: newState,
            stability: newStability,
            difficulty: newDifficulty,
            reps: newReps,
            lapses: newLapses,
            due,
            lastReview: now,
          })

          return {
            card: newCard,
            scheduledDays,
            elapsedDays,
          }
        }),

      createNew: (deckId, type, front, back) =>
        Effect.sync(() => {
          const now = new Date()
          return new Card({
            id: CardId.generate(),
            deckId,
            type,
            due: now, // Due immediately
            stability: 0,
            difficulty: 0,
            reps: 0,
            lapses: 0,
            state: "new",
            lastReview: null,
            front,
            back,
            audioFront: null,
            audioBack: null,
            image: null,
            personalNote: null,
            tags: [],
            createdAt: now,
          })
        }),

      retrievability: (card, now) =>
        Effect.sync(() => {
          if (card.state === "new" || !card.lastReview) {
            return 1 // New cards have 100% retrievability (we haven't tested them yet)
          }

          const elapsedDays =
            (now.getTime() - card.lastReview.getTime()) / (1000 * 60 * 60 * 24)

          return calculateRetrievability(card.stability, elapsedDays)
        }),
    })
  )

  static Test = Layer.succeed(
    FsrsService,
    FsrsService.of({
      schedule: (card, rating, now) =>
        Effect.succeed({
          card: new Card({
            ...card,
            due: new Date(now.getTime() + 24 * 60 * 60 * 1000),
            lastReview: now,
          }),
          scheduledDays: 1,
          elapsedDays: 0,
        }),
      createNew: (deckId, type, front, back) =>
        Effect.succeed(
          new Card({
            id: CardId.generate(),
            deckId,
            type,
            due: new Date(),
            stability: 0,
            difficulty: 0,
            reps: 0,
            lapses: 0,
            state: "new",
            lastReview: null,
            front,
            back,
            audioFront: null,
            audioBack: null,
            image: null,
            personalNote: null,
            tags: [],
            createdAt: new Date(),
          })
        ),
      retrievability: () => Effect.succeed(0.9),
    })
  )
}

// FSRS-6 Algorithm Implementation

function initializeCard(rating: Rating): {
  state: CardState
  stability: number
  difficulty: number
  interval: number
} {
  const w = DEFAULT_WEIGHTS

  // Initial stability based on rating
  const stability =
    rating === 1
      ? w[0]!
      : rating === 2
        ? w[1]!
        : rating === 3
          ? w[2]!
          : w[3]!

  // Initial difficulty
  const clampedDifficulty = initialDifficulty(rating)

  // Initial interval
  let interval: number
  let state: CardState

  if (rating === 1) {
    interval = 1
    state = "learning"
  } else if (rating === 2) {
    interval = 1
    state = "learning"
  } else if (rating === 3) {
    interval = calculateInterval(stability, DEFAULT_RETENTION)
    state = "review"
  } else {
    interval = calculateInterval(stability, DEFAULT_RETENTION)
    state = "review"
  }

  return {
    state,
    stability,
    difficulty: clampedDifficulty,
    interval,
  }
}

// FSRS-6 constants
const DECAY = -0.5
const FACTOR = 19 / 81

function calculateRetrievability(stability: number, elapsedDays: number): number {
  if (stability === 0) return 1
  // FSRS-6: R = (1 + FACTOR * t/s)^(1/DECAY)
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, 1 / DECAY)
}

function calculateInterval(stability: number, requestedRetention: number): number {
  // FSRS-6: t = (s/FACTOR) * (R^DECAY - 1)
  return (stability / FACTOR) * (Math.pow(requestedRetention, DECAY) - 1)
}

function initialDifficulty(rating: Rating): number {
  const w = DEFAULT_WEIGHTS
  return Math.max(1, Math.min(10, w[4]! - Math.exp(w[5]! * (rating - 1)) + 1))
}

function updateDifficulty(difficulty: number, rating: Rating): number {
  const w = DEFAULT_WEIGHTS
  // FSRS-5: D'(D, G) = w7 * D0(3) + (1 - w7) * (D - w6 * (G - 3))
  // w7 = mean reversion weight (small), w6 = difficulty adjustment per rating step
  // D0(3) = initial difficulty for "Good" rating (mean reversion target)
  const d0Good = initialDifficulty(3)
  const newDifficulty = w[7]! * d0Good + (1 - w[7]!) * (difficulty - w[6]! * (rating - 3))
  return Math.max(1, Math.min(10, newDifficulty))
}

function calculateStabilityAfterSuccess(
  difficulty: number,
  stability: number,
  retrievability: number,
  rating: Rating
): number {
  const w = DEFAULT_WEIGHTS

  // FSRS-6 stability formula after successful recall
  const hardPenalty = rating === 2 ? w[15]! : 1
  const easyBonus = rating === 4 ? w[16]! : 1

  const newStability =
    stability *
    (Math.exp(w[8]!) *
      (11 - difficulty) *
      Math.pow(stability, -w[9]!) *
      (Math.exp((1 - retrievability) * w[10]!) - 1) *
      hardPenalty *
      easyBonus +
      1)

  return Math.max(0.1, newStability)
}

function calculateStabilityAfterForget(
  difficulty: number,
  stability: number,
  retrievability: number
): number {
  const w = DEFAULT_WEIGHTS

  // FSRS-6 stability formula after forgetting
  const newStability =
    w[11]! *
    Math.pow(difficulty, -w[12]!) *
    (Math.pow(stability + 1, w[13]!) - 1) *
    Math.exp((1 - retrievability) * w[14]!)

  return Math.max(0.1, Math.min(stability, newStability))
}

function applyFuzz(interval: number): Effect.Effect<number> {
  if (interval < 2.5) return Effect.succeed(interval)

  return Random.next.pipe(
    Effect.map((rand) => {
      const fuzzFactor = 0.05 // 5% fuzz
      const fuzz = interval * fuzzFactor * (rand * 2 - 1)
      return interval + fuzz
    })
  )
}
