import { Effect } from "effect"
import { describe, expect, it } from "effect-bun-test/v3"
import { DeckId, CreateDeckInput } from "@serious/shared"
import { DeckNotFound } from "../src/errors"
import { DeckService } from "../src/services/Deck"

describe("DeckService", () => {
  const TestLayer = () => DeckService.Test()

  describe("create", () => {
    it.effect("creates a new deck with required fields", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService

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
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("creates a deck with all optional fields", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService

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
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("creates decks with unique IDs", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService

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
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("get", () => {
    it.effect("returns existing deck", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService

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
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("fails with DeckNotFound for non-existent deck", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        const nonExistentId = DeckId.make("non-existent")

        const result = yield* deckService.get(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(DeckNotFound)
        expect((result as DeckNotFound).deckId).toBe("non-existent")
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("getAll", () => {
    it.effect("returns all decks", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService

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
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("returns empty array when no decks exist", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        const allDecks = yield* deckService.getAll()
        expect(allDecks).toHaveLength(0)
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("getStats", () => {
    it.effect("returns stats for existing deck", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService

        const deck = yield* deckService.create(
          new CreateDeckInput({
            name: "Test Deck",
            targetLanguage: "es",
            nativeLanguage: "en",
          })
        )

        const stats = yield* deckService.getStats(deck.id)

        expect(stats.deckId).toBe(deck.id)
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("fails with DeckNotFound for non-existent deck", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        const nonExistentId = DeckId.make("non-existent")

        const result = yield* deckService.getStats(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(DeckNotFound)
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("update", () => {
    it.effect("updates deck fields", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService

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
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("fails with DeckNotFound for non-existent deck", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        const nonExistentId = DeckId.make("non-existent")

        const result = yield* deckService
          .update(nonExistentId, { name: "New" })
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(DeckNotFound)
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("delete", () => {
    it.effect("deletes an existing deck", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService

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
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("fails with DeckNotFound for non-existent deck", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        const nonExistentId = DeckId.make("non-existent")

        const result = yield* deckService.delete(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(DeckNotFound)
      }).pipe(Effect.provide(TestLayer()))
    )
  })
})
