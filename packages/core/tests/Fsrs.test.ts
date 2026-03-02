import { Effect, Layer } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { FsrsService } from "../src/services/Fsrs"
import { Card, CardId, DeckId } from "@serious/shared"

describe("FsrsService", () => {
  const testLayer = FsrsService.Live

  describe("createNew", () => {
    it.effect("creates a card with initial FSRS values", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = yield* fsrs.createNew(
          DeckId.make("deck-1"),
          "basic",
          "front content",
          "back content"
        )

        expect(card.deckId).toBe("deck-1")
        expect(card.type).toBe("basic")
        expect(card.front).toBe("front content")
        expect(card.back).toBe("back content")
        expect(card.state).toBe("new")
        expect(card.stability).toBe(0)
        expect(card.difficulty).toBe(0)
        expect(card.reps).toBe(0)
        expect(card.lapses).toBe(0)
        expect(card.lastReview).toBeNull()
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("creates cards with unique IDs", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card1 = yield* fsrs.createNew(
          DeckId.make("deck-1"),
          "basic",
          "front",
          "back"
        )
        const card2 = yield* fsrs.createNew(
          DeckId.make("deck-1"),
          "basic",
          "front",
          "back"
        )

        expect(card1.id).not.toBe(card2.id)
      }).pipe(Effect.provide(testLayer))
    )
  })

  describe("schedule - new card", () => {
    const makeNewCard = (overrides?: Partial<Card>) =>
      new Card({
        id: CardId.make("card-1"),
        deckId: DeckId.make("deck-1"),
        type: "basic",
        due: new Date("2024-01-01"),
        stability: 0,
        difficulty: 0,
        reps: 0,
        lapses: 0,
        state: "new",
        lastReview: null,
        front: "front",
        back: "back",
        audioFront: null,
        audioBack: null,
        image: null,
        personalNote: null,
        tags: [],
        createdAt: new Date("2024-01-01"),
        ...overrides,
      })

    it.effect("schedules new card with Again rating (1)", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = makeNewCard()
        const now = new Date("2024-01-01T12:00:00Z")

        const result = yield* fsrs.schedule(card, 1, now)

        expect(result.card.state).toBe("learning")
        expect(result.card.reps).toBe(1)
        expect(result.card.lapses).toBe(0) // Not a lapse for new cards
        expect(result.card.stability).toBeGreaterThan(0)
        expect(result.scheduledDays).toBe(1)
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("schedules new card with Good rating (3)", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = makeNewCard()
        const now = new Date("2024-01-01T12:00:00Z")

        const result = yield* fsrs.schedule(card, 3, now)

        expect(result.card.state).toBe("review")
        expect(result.card.reps).toBe(1)
        expect(result.card.stability).toBeGreaterThan(0)
        // FSRS-6 formula produces shorter intervals for low stability
        expect(result.scheduledDays).toBeGreaterThan(0)
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("schedules new card with Easy rating (4)", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = makeNewCard()
        const now = new Date("2024-01-01T12:00:00Z")

        const result = yield* fsrs.schedule(card, 4, now)

        expect(result.card.state).toBe("review")
        expect(result.card.reps).toBe(1)
        expect(result.card.stability).toBeGreaterThan(0)
        // Easy should give longer interval than Good
        const goodResult = yield* fsrs.schedule(card, 3, now)
        expect(result.card.stability).toBeGreaterThan(goodResult.card.stability)
      }).pipe(Effect.provide(testLayer))
    )
  })

  describe("schedule - review card", () => {
    const makeReviewCard = (overrides?: Partial<Card>) =>
      new Card({
        id: CardId.make("card-1"),
        deckId: DeckId.make("deck-1"),
        type: "basic",
        due: new Date("2024-01-10"),
        stability: 5, // ~5 days initial stability
        difficulty: 5, // Medium difficulty
        reps: 3,
        lapses: 0,
        state: "review",
        lastReview: new Date("2024-01-05"),
        front: "front",
        back: "back",
        audioFront: null,
        audioBack: null,
        image: null,
        personalNote: null,
        tags: [],
        createdAt: new Date("2024-01-01"),
        ...overrides,
      })

    it.effect("handles Again (1) - card forgotten", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = makeReviewCard()
        const now = new Date("2024-01-10T12:00:00Z")

        const result = yield* fsrs.schedule(card, 1, now)

        expect(result.card.state).toBe("relearning")
        expect(result.card.lapses).toBe(1) // Incremented
        expect(result.scheduledDays).toBe(1) // Review again tomorrow
        expect(result.card.stability).toBeLessThan(card.stability) // Stability decreases
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("handles Good (3) - increases stability", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = makeReviewCard()
        const now = new Date("2024-01-10T12:00:00Z")

        const result = yield* fsrs.schedule(card, 3, now)

        expect(result.card.state).toBe("review")
        expect(result.card.reps).toBe(4) // Incremented
        expect(result.card.stability).toBeGreaterThan(card.stability) // Stability increases
        expect(result.scheduledDays).toBeGreaterThan(1)
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("Easy gives longer interval than Good", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = makeReviewCard()
        const now = new Date("2024-01-10T12:00:00Z")

        const goodResult = yield* fsrs.schedule(card, 3, now)
        const easyResult = yield* fsrs.schedule(card, 4, now)

        expect(easyResult.card.stability).toBeGreaterThan(
          goodResult.card.stability
        )
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("Hard gives shorter interval than Good", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = makeReviewCard()
        const now = new Date("2024-01-10T12:00:00Z")

        const hardResult = yield* fsrs.schedule(card, 2, now)
        const goodResult = yield* fsrs.schedule(card, 3, now)

        expect(hardResult.card.stability).toBeLessThan(
          goodResult.card.stability
        )
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("Easy should decrease difficulty, Hard should increase it", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = makeReviewCard({ difficulty: 5 })
        const now = new Date("2024-01-10T12:00:00Z")

        const easyResult = yield* fsrs.schedule(card, 4, now)
        const hardResult = yield* fsrs.schedule(card, 2, now)

        // Easy (4) should decrease difficulty from 5
        expect(easyResult.card.difficulty).toBeLessThan(card.difficulty)
        // Hard (2) should increase difficulty from 5
        expect(hardResult.card.difficulty).toBeGreaterThan(card.difficulty)
      }).pipe(Effect.provide(testLayer))
    )
  })

  describe("retrievability", () => {
    it.effect("returns 1 for new cards", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = new Card({
          id: CardId.make("card-1"),
          deckId: DeckId.make("deck-1"),
          type: "basic",
          due: new Date("2024-01-01"),
          stability: 0,
          difficulty: 0,
          reps: 0,
          lapses: 0,
          state: "new",
          lastReview: null,
          front: "front",
          back: "back",
          audioFront: null,
          audioBack: null,
          image: null,
          personalNote: null,
          tags: [],
          createdAt: new Date("2024-01-01"),
        })

        const r = yield* fsrs.retrievability(card, new Date("2024-01-10"))
        expect(r).toBe(1)
      }).pipe(Effect.provide(testLayer))
    )

    it.effect("decreases over time for reviewed cards", () =>
      Effect.gen(function* () {
        const fsrs = yield* FsrsService
        const card = new Card({
          id: CardId.make("card-1"),
          deckId: DeckId.make("deck-1"),
          type: "basic",
          due: new Date("2024-01-10"),
          stability: 10,
          difficulty: 5,
          reps: 3,
          lapses: 0,
          state: "review",
          lastReview: new Date("2024-01-01"),
          front: "front",
          back: "back",
          audioFront: null,
          audioBack: null,
          image: null,
          personalNote: null,
          tags: [],
          createdAt: new Date("2024-01-01"),
        })

        const r1Day = yield* fsrs.retrievability(card, new Date("2024-01-02"))
        const r5Days = yield* fsrs.retrievability(card, new Date("2024-01-06"))
        const r10Days = yield* fsrs.retrievability(card, new Date("2024-01-11"))

        expect(r1Day).toBeGreaterThan(r5Days)
        expect(r5Days).toBeGreaterThan(r10Days)
        expect(r10Days).toBeGreaterThan(0)
        expect(r1Day).toBeLessThanOrEqual(1)
      }).pipe(Effect.provide(testLayer))
    )
  })
})
