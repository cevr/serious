import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Deck, DeckId, DeckStats, CreateDeckInput } from "@serious/shared"
import { DeckNotFound } from "../src/errors"
import type { DeckServiceShape } from "../src/services/Deck"

// Inline test implementation typed against DeckServiceShape to validate interface conformance.
// Cannot import DeckService directly — transitive bun:sqlite dependency breaks vitest (Node).

describe("DeckService", () => {
  const makeTestDeckService = (): DeckServiceShape => {
    const decks = new Map<string, Deck>()

    return {
      create: (input) =>
        Effect.sync(() => {
          const now = new Date()
          const deck = new Deck({
            id: DeckId.generate(),
            name: input.name,
            description: input.description ?? null,
            targetLanguage: input.targetLanguage,
            nativeLanguage: input.nativeLanguage,
            newCardsPerDay: input.newCardsPerDay ?? 20,
            reviewsPerDay: input.reviewsPerDay ?? 200,
            stage: input.stage ?? "vocabulary",
            createdAt: now,
            updatedAt: now,
          })
          decks.set(deck.id, deck)
          return deck
        }),
      get: (id) => {
        const deck = decks.get(id)
        return deck
          ? Effect.succeed(deck)
          : Effect.fail(new DeckNotFound({ deckId: id }))
      },
      getAll: () => Effect.succeed(Array.from(decks.values())),
      getStats: (id) => {
        if (!decks.has(id)) {
          return Effect.fail(new DeckNotFound({ deckId: id }))
        }
        return Effect.succeed(
          new DeckStats({
            deckId: id,
            totalCards: 10,
            newCount: 5,
            learningCount: 2,
            reviewCount: 3,
            dueToday: 7,
            retentionRate: 0.85,
            streak: 5,
          })
        )
      },
      update: (id, data) => {
        const existing = decks.get(id)
        if (!existing) {
          return Effect.fail(new DeckNotFound({ deckId: id }))
        }
        const updated = new Deck({
          ...existing,
          ...data,
          updatedAt: new Date(),
        })
        decks.set(id, updated)
        return Effect.succeed(updated)
      },
      delete: (id) => {
        if (!decks.has(id)) {
          return Effect.fail(new DeckNotFound({ deckId: id }))
        }
        decks.delete(id)
        return Effect.void
      },
    }
  }

  describe("create", () => {
    it.effect("creates a new deck with required fields", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()

        const input = new CreateDeckInput({
          name: "Spanish Vocabulary",
          targetLanguage: "es",
          nativeLanguage: "en",
        })

        const deck = yield* deckService.create(input)

        expect(deck.name).toBe("Spanish Vocabulary")
        expect(deck.targetLanguage).toBe("es")
        expect(deck.nativeLanguage).toBe("en")
        expect(deck.newCardsPerDay).toBe(20) // Default
        expect(deck.reviewsPerDay).toBe(200) // Default
        expect(deck.stage).toBe("vocabulary") // Default
        expect(deck.description).toBeNull()
      })
    )

    it.effect("creates a deck with all optional fields", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()

        const input = new CreateDeckInput({
          name: "Japanese Pronunciation",
          description: "Focus on pitch accent",
          targetLanguage: "ja",
          nativeLanguage: "en",
          newCardsPerDay: 10,
          reviewsPerDay: 100,
          stage: "pronunciation",
        })

        const deck = yield* deckService.create(input)

        expect(deck.name).toBe("Japanese Pronunciation")
        expect(deck.description).toBe("Focus on pitch accent")
        expect(deck.newCardsPerDay).toBe(10)
        expect(deck.reviewsPerDay).toBe(100)
        expect(deck.stage).toBe("pronunciation")
      })
    )

    it.effect("creates decks with unique IDs", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()

        const deck1 = yield* deckService.create(
          new CreateDeckInput({
            name: "Deck 1",
            targetLanguage: "es",
            nativeLanguage: "en",
          })
        )

        const deck2 = yield* deckService.create(
          new CreateDeckInput({
            name: "Deck 2",
            targetLanguage: "fr",
            nativeLanguage: "en",
          })
        )

        expect(deck1.id).not.toBe(deck2.id)
      })
    )
  })

  describe("get", () => {
    it.effect("returns existing deck", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()

        const created = yield* deckService.create(
          new CreateDeckInput({
            name: "Test Deck",
            targetLanguage: "de",
            nativeLanguage: "en",
          })
        )

        const retrieved = yield* deckService.get(created.id)

        expect(retrieved.id).toBe(created.id)
        expect(retrieved.name).toBe("Test Deck")
      })
    )

    it.effect("fails with DeckNotFound for non-existent deck", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()
        const nonExistentId = DeckId.make("non-existent")

        const result = yield* deckService.get(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(DeckNotFound)
        expect((result as DeckNotFound).deckId).toBe("non-existent")
      })
    )
  })

  describe("getAll", () => {
    it.effect("returns all decks", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()

        yield* deckService.create(
          new CreateDeckInput({
            name: "Spanish",
            targetLanguage: "es",
            nativeLanguage: "en",
          })
        )
        yield* deckService.create(
          new CreateDeckInput({
            name: "French",
            targetLanguage: "fr",
            nativeLanguage: "en",
          })
        )
        yield* deckService.create(
          new CreateDeckInput({
            name: "German",
            targetLanguage: "de",
            nativeLanguage: "en",
          })
        )

        const allDecks = yield* deckService.getAll()

        expect(allDecks).toHaveLength(3)
      })
    )

    it.effect("returns empty array when no decks exist", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()
        const allDecks = yield* deckService.getAll()
        expect(allDecks).toHaveLength(0)
      })
    )
  })

  describe("getStats", () => {
    it.effect("returns stats for existing deck", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()

        const deck = yield* deckService.create(
          new CreateDeckInput({
            name: "Test Deck",
            targetLanguage: "es",
            nativeLanguage: "en",
          })
        )

        const stats = yield* deckService.getStats(deck.id)

        expect(stats.deckId).toBe(deck.id)
        expect(stats.totalCards).toBe(10) // From test mock
        expect(stats.retentionRate).toBe(0.85)
      })
    )

    it.effect("fails with DeckNotFound for non-existent deck", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()
        const nonExistentId = DeckId.make("non-existent")

        const result = yield* deckService.getStats(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(DeckNotFound)
      })
    )
  })

  describe("update", () => {
    it.effect("updates deck fields", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()

        const created = yield* deckService.create(
          new CreateDeckInput({
            name: "Original Name",
            targetLanguage: "es",
            nativeLanguage: "en",
          })
        )

        const updated = yield* deckService.update(created.id, {
          name: "Updated Name",
          description: "New description",
          newCardsPerDay: 30,
        })

        expect(updated.name).toBe("Updated Name")
        expect(updated.description).toBe("New description")
        expect(updated.newCardsPerDay).toBe(30)
        expect(updated.targetLanguage).toBe("es") // Unchanged
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
          created.updatedAt.getTime()
        )
      })
    )

    it.effect("fails with DeckNotFound for non-existent deck", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()
        const nonExistentId = DeckId.make("non-existent")

        const result = yield* deckService
          .update(nonExistentId, { name: "New" })
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(DeckNotFound)
      })
    )
  })

  describe("delete", () => {
    it.effect("deletes an existing deck", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()

        const deck = yield* deckService.create(
          new CreateDeckInput({
            name: "To Delete",
            targetLanguage: "es",
            nativeLanguage: "en",
          })
        )

        yield* deckService.delete(deck.id)

        const result = yield* deckService.get(deck.id).pipe(Effect.flip)
        expect(result).toBeInstanceOf(DeckNotFound)
      })
    )

    it.effect("fails with DeckNotFound for non-existent deck", () =>
      Effect.gen(function* () {
        const deckService = makeTestDeckService()
        const nonExistentId = DeckId.make("non-existent")

        const result = yield* deckService.delete(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(DeckNotFound)
      })
    )
  })
})
