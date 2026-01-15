import { Context, Effect, Layer, Option } from "effect"
import {
  Card,
  CardId,
  type CardType,
  type CreateCardInput,
  type DeckId,
} from "@serious/shared"
import { DatabaseService } from "../storage/Database"
import { FsrsService } from "./Fsrs"
import { CardNotFound } from "../errors"

export interface CardService {
  readonly create: (input: CreateCardInput) => Effect.Effect<Card>
  readonly get: (id: CardId) => Effect.Effect<Card, CardNotFound>
  readonly getByDeck: (deckId: DeckId) => Effect.Effect<readonly Card[]>
  readonly getDue: (
    deckId: DeckId,
    limit: number
  ) => Effect.Effect<readonly Card[]>
  readonly update: (
    id: CardId,
    data: Partial<Card>
  ) => Effect.Effect<Card, CardNotFound>
  readonly delete: (id: CardId) => Effect.Effect<void, CardNotFound>
}

export class CardService extends Context.Tag("CardService")<
  CardService,
  CardService
>() {
  static Live = Layer.effect(
    CardService,
    Effect.gen(function* () {
      const db = yield* DatabaseService
      const fsrs = yield* FsrsService

      return CardService.of({
        create: (input) =>
          Effect.gen(function* () {
            const card = yield* fsrs.createNew(
              input.deckId,
              input.type,
              input.front,
              input.back
            )

            // Apply optional fields from input
            const fullCard = new Card({
              ...card,
              audioFront: input.audioFront ?? null,
              audioBack: input.audioBack ?? null,
              image: input.image ?? null,
              personalNote: input.personalNote ?? null,
              tags: input.tags ?? [],
            })

            yield* db.insertCard(fullCard)
            return fullCard
          }),

        get: (id) =>
          Effect.gen(function* () {
            const card = yield* db.getCard(id)
            if (Option.isNone(card)) {
              return yield* Effect.fail(new CardNotFound({ cardId: id }))
            }
            return card.value
          }),

        getByDeck: (deckId) => db.getCardsByDeck(deckId),

        getDue: (deckId, limit) => db.getDueCards(deckId, limit, new Date()),

        update: (id, data) =>
          Effect.gen(function* () {
            const existing = yield* db.getCard(id)
            if (Option.isNone(existing)) {
              return yield* Effect.fail(new CardNotFound({ cardId: id }))
            }
            const updated = new Card({ ...existing.value, ...data })
            yield* db.updateCard(updated)
            return updated
          }),

        delete: (id) =>
          Effect.gen(function* () {
            const existing = yield* db.getCard(id)
            if (Option.isNone(existing)) {
              return yield* Effect.fail(new CardNotFound({ cardId: id }))
            }
            yield* db.deleteCard(id)
          }),
      })
    })
  )

  static Test = (cards: Map<string, Card> = new Map()) =>
    Layer.succeed(
      CardService,
      CardService.of({
        create: (input) =>
          Effect.sync(() => {
            const card = new Card({
              id: CardId.generate(),
              deckId: input.deckId,
              type: input.type,
              due: new Date(),
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
              createdAt: new Date(),
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
      })
    )
}
