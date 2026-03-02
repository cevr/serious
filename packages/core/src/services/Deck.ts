import { Context, Effect, Layer, Option } from "effect"
import {
  CreateDeckInput,
  Deck,
  DeckId,
  DeckStats,
  type DeckId as DeckIdType,
} from "@serious/shared"
import { DatabaseService } from "../storage/Database"
import { DeckNotFound } from "../errors"

/** Only settings fields are updatable — not id, createdAt, or other immutables */
export type DeckSettingsUpdate = Partial<Pick<Deck, "name" | "description" | "targetLanguage" | "nativeLanguage" | "newCardsPerDay" | "reviewsPerDay" | "stage">>

export interface DeckServiceShape {
  readonly create: (input: CreateDeckInput) => Effect.Effect<Deck>
  readonly get: (id: DeckIdType) => Effect.Effect<Deck, DeckNotFound>
  readonly getAll: () => Effect.Effect<readonly Deck[]>
  readonly getStats: (id: DeckIdType) => Effect.Effect<DeckStats, DeckNotFound>
  readonly update: (
    id: DeckIdType,
    data: DeckSettingsUpdate
  ) => Effect.Effect<Deck, DeckNotFound>
  readonly delete: (id: DeckIdType) => Effect.Effect<void, DeckNotFound>
}

export class DeckService extends Context.Tag("DeckService")<
  DeckService,
  DeckServiceShape
>() {
  static Live = Layer.effect(
    DeckService,
    Effect.gen(function* () {
      const db = yield* DatabaseService

      return DeckService.of({
        create: (input) =>
          Effect.gen(function* () {
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
            yield* db.insertDeck(deck)
            return deck
          }),

        get: (id) =>
          Effect.gen(function* () {
            const deck = yield* db.getDeck(id)
            if (Option.isNone(deck)) {
              return yield* Effect.fail(new DeckNotFound({ deckId: id }))
            }
            return deck.value
          }),

        getAll: () => db.getAllDecks(),

        getStats: (id) =>
          Effect.gen(function* () {
            const deck = yield* db.getDeck(id)
            if (Option.isNone(deck)) {
              return yield* Effect.fail(new DeckNotFound({ deckId: id }))
            }
            return yield* db.getDeckStats(id)
          }),

        update: (id, data) =>
          Effect.gen(function* () {
            const existing = yield* db.getDeck(id)
            if (Option.isNone(existing)) {
              return yield* Effect.fail(new DeckNotFound({ deckId: id }))
            }
            const updated = new Deck({
              ...existing.value,
              ...data,
              updatedAt: new Date(),
            })
            yield* db.updateDeck(updated)
            return updated
          }),

        delete: (id) =>
          Effect.gen(function* () {
            const existing = yield* db.getDeck(id)
            if (Option.isNone(existing)) {
              return yield* Effect.fail(new DeckNotFound({ deckId: id }))
            }
            yield* db.deleteDeck(id)
          }),
      })
    })
  )

  static Test = (decks: Map<string, Deck> = new Map()) =>
    Layer.succeed(
      DeckService,
      DeckService.of({
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
              totalCards: 0,
              newCount: 0,
              learningCount: 0,
              reviewCount: 0,
              dueToday: 0,
              retentionRate: 0,
              streak: 0,
            })
          )
        },
        update: (id, data: DeckSettingsUpdate) => {
          const existing = decks.get(id)
          if (!existing) {
            return Effect.fail(new DeckNotFound({ deckId: id }))
          }
          const updated = new Deck({ ...existing, ...data, updatedAt: new Date() })
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
      })
    )
}
