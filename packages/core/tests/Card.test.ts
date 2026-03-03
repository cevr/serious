import { Effect } from "effect"
import { describe, expect, it } from "effect-bun-test/v3"
import { CardId, DeckId, CreateCardInput } from "@serious/shared"
import { CardNotFound } from "../src/errors"
import { CardService } from "../src/services/Card"

describe("CardService", () => {
  const TestLayer = () => CardService.Test()

  describe("create", () => {
    it.effect("creates a new card", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService

        const input = new CreateCardInput({
          deckId: DeckId.make("deck-1"),
          type: "basic",
          front: "Hello",
          back: "Hola",
        })

        const card = yield* cardService.create(input)

        expect(card.deckId).toBe("deck-1")
        expect(card.type).toBe("basic")
        expect(card.front).toBe("Hello")
        expect(card.back).toBe("Hola")
        expect(card.state).toBe("new")
        expect(card.tags).toEqual([])
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("creates card with optional fields", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService

        const input = new CreateCardInput({
          deckId: DeckId.make("deck-1"),
          type: "basic",
          front: "Hello",
          back: "Hola",
          personalNote: "My friend says this",
          tags: ["greeting", "common"],
        })

        const card = yield* cardService.create(input)

        expect(card.personalNote).toBe("My friend says this")
        expect(card.tags).toEqual(["greeting", "common"])
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("get", () => {
    it.effect("returns existing card", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService

        const input = new CreateCardInput({
          deckId: DeckId.make("deck-1"),
          type: "basic",
          front: "Hello",
          back: "Hola",
        })

        const created = yield* cardService.create(input)
        const retrieved = yield* cardService.get(created.id)

        expect(retrieved.id).toBe(created.id)
        expect(retrieved.front).toBe("Hello")
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("fails with CardNotFound for non-existent card", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        const nonExistentId = CardId.make("non-existent")

        const result = yield* cardService.get(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(CardNotFound)
        expect((result as CardNotFound).cardId).toBe("non-existent")
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("getByDeck", () => {
    it.effect("returns cards for a specific deck", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService

        // Create cards in two different decks
        yield* cardService.create(
          new CreateCardInput({
            deckId: DeckId.make("deck-1"),
            type: "basic",
            front: "Card 1",
            back: "Back 1",
          })
        )
        yield* cardService.create(
          new CreateCardInput({
            deckId: DeckId.make("deck-1"),
            type: "basic",
            front: "Card 2",
            back: "Back 2",
          })
        )
        yield* cardService.create(
          new CreateCardInput({
            deckId: DeckId.make("deck-2"),
            type: "basic",
            front: "Card 3",
            back: "Back 3",
          })
        )

        const deck1Cards = yield* cardService.getByDeck(DeckId.make("deck-1"))
        const deck2Cards = yield* cardService.getByDeck(DeckId.make("deck-2"))

        expect(deck1Cards).toHaveLength(2)
        expect(deck2Cards).toHaveLength(1)
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("getDue", () => {
    it.effect("returns only due cards up to limit", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        const deckId = DeckId.make("deck-1")

        // Create 3 cards - all due immediately when created
        yield* cardService.create(
          new CreateCardInput({
            deckId,
            type: "basic",
            front: "Card 1",
            back: "Back 1",
          })
        )
        yield* cardService.create(
          new CreateCardInput({
            deckId,
            type: "basic",
            front: "Card 2",
            back: "Back 2",
          })
        )
        yield* cardService.create(
          new CreateCardInput({
            deckId,
            type: "basic",
            front: "Card 3",
            back: "Back 3",
          })
        )

        const dueCards = yield* cardService.getDue(deckId, 2)

        expect(dueCards).toHaveLength(2)
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("update", () => {
    it.effect("updates an existing card", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService

        const created = yield* cardService.create(
          new CreateCardInput({
            deckId: DeckId.make("deck-1"),
            type: "basic",
            front: "Hello",
            back: "Hola",
          })
        )

        const updated = yield* cardService.update(created.id, {
          front: "Hi",
          personalNote: "Updated note",
        })

        expect(updated.front).toBe("Hi")
        expect(updated.back).toBe("Hola") // Unchanged
        expect(updated.personalNote).toBe("Updated note")
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("fails with CardNotFound for non-existent card", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        const nonExistentId = CardId.make("non-existent")

        const result = yield* cardService
          .update(nonExistentId, { front: "New" })
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(CardNotFound)
      }).pipe(Effect.provide(TestLayer()))
    )
  })

  describe("delete", () => {
    it.effect("deletes an existing card", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService

        const created = yield* cardService.create(
          new CreateCardInput({
            deckId: DeckId.make("deck-1"),
            type: "basic",
            front: "Hello",
            back: "Hola",
          })
        )

        yield* cardService.delete(created.id)

        const result = yield* cardService.get(created.id).pipe(Effect.flip)
        expect(result).toBeInstanceOf(CardNotFound)
      }).pipe(Effect.provide(TestLayer()))
    )

    it.effect("fails with CardNotFound for non-existent card", () =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        const nonExistentId = CardId.make("non-existent")

        const result = yield* cardService.delete(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(CardNotFound)
      }).pipe(Effect.provide(TestLayer()))
    )
  })
})
