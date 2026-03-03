import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { Card, CardId, DeckId, CreateCardInput } from "@serious/shared"
import { CardNotFound } from "../src/errors"
import type { CardServiceShape } from "../src/services/Card"

// Inline test implementation typed against CardServiceShape to validate interface conformance.
// Cannot import CardService directly — transitive bun:sqlite dependency breaks vitest (Node).

describe("CardService", () => {
  const makeTestCardService = (): CardServiceShape => {
    const cards = new Map<string, Card>()

    return {
      create: (input) =>
        Effect.sync(() => {
          const now = new Date()
          const card = new Card({
            id: CardId.generate(),
            deckId: input.deckId,
            type: input.type,
            due: now,
            stability: 0,
            difficulty: 0,
            reps: 0,
            lapses: 0,
            state: "new",
            lastReview: null,
            front: input.front,
            back: input.back,
            audioFront: input.audioFront ?? null,
            audioBack: input.audioBack ?? null,
            image: input.image ?? null,
            personalNote: input.personalNote ?? null,
            tags: input.tags ?? [],
            createdAt: now,
          })
          cards.set(card.id, card)
          return card
        }),
      get: (id) => {
        const card = cards.get(id)
        return card
          ? Effect.succeed(card)
          : Effect.fail(new CardNotFound({ cardId: id }))
      },
      getByDeck: (deckId) =>
        Effect.succeed(
          Array.from(cards.values()).filter((c) => c.deckId === deckId)
        ),
      getDue: (deckId, limit) =>
        Effect.succeed(
          Array.from(cards.values())
            .filter((c) => c.deckId === deckId && c.due <= new Date())
            .slice(0, limit)
        ),
      update: (id, data) => {
        const existing = cards.get(id)
        if (!existing) {
          return Effect.fail(new CardNotFound({ cardId: id }))
        }
        const updated = new Card({ ...existing, ...data })
        cards.set(id, updated)
        return Effect.succeed(updated)
      },
      delete: (id) => {
        if (!cards.has(id)) {
          return Effect.fail(new CardNotFound({ cardId: id }))
        }
        cards.delete(id)
        return Effect.void
      },
    }
  }

  describe("create", () => {
    it.effect("creates a new card", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()

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
      })
    )

    it.effect("creates card with optional fields", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()

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
      })
    )
  })

  describe("get", () => {
    it.effect("returns existing card", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()

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
      })
    )

    it.effect("fails with CardNotFound for non-existent card", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()
        const nonExistentId = CardId.make("non-existent")

        const result = yield* cardService.get(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(CardNotFound)
        expect((result as CardNotFound).cardId).toBe("non-existent")
      })
    )
  })

  describe("getByDeck", () => {
    it.effect("returns cards for a specific deck", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()

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
      })
    )
  })

  describe("getDue", () => {
    it.effect("returns only due cards up to limit", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()
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
      })
    )
  })

  describe("update", () => {
    it.effect("updates an existing card", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()

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
      })
    )

    it.effect("fails with CardNotFound for non-existent card", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()
        const nonExistentId = CardId.make("non-existent")

        const result = yield* cardService
          .update(nonExistentId, { front: "New" })
          .pipe(Effect.flip)

        expect(result).toBeInstanceOf(CardNotFound)
      })
    )
  })

  describe("delete", () => {
    it.effect("deletes an existing card", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()

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
      })
    )

    it.effect("fails with CardNotFound for non-existent card", () =>
      Effect.gen(function* () {
        const cardService = makeTestCardService()
        const nonExistentId = CardId.make("non-existent")

        const result = yield* cardService.delete(nonExistentId).pipe(Effect.flip)

        expect(result).toBeInstanceOf(CardNotFound)
      })
    )
  })
})
