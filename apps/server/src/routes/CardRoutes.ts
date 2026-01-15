import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { CardService, DeckService } from "@serious/core"
import { SeriousApi, CardNotFoundError, DeckNotFoundError, PaginatedCards } from "@serious/api"
import type { CardId, DeckId } from "@serious/shared"

export const CardRoutesLive = HttpApiBuilder.group(SeriousApi, "cards", (handlers) =>
  handlers
    .handle("listByDeck", ({ path, urlParams }) =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        const deckService = yield* DeckService

        // Verify deck exists
        yield* deckService.get(path.deckId as DeckId).pipe(
          Effect.mapError(
            () =>
              new DeckNotFoundError({
                deckId: path.deckId,
                message: `Deck with id ${path.deckId} not found`,
              })
          )
        )

        const allCards = yield* cardService.getByDeck(path.deckId as DeckId)

        // Apply filtering
        let filteredCards = allCards
        if (urlParams.state) {
          filteredCards = filteredCards.filter((c) => c.state === urlParams.state)
        }
        if (urlParams.search) {
          const search = urlParams.search.toLowerCase()
          filteredCards = filteredCards.filter(
            (c) =>
              c.front.toLowerCase().includes(search) ||
              c.back.toLowerCase().includes(search)
          )
        }
        if (urlParams.tags) {
          const tags = urlParams.tags.split(",").map((t) => t.trim())
          filteredCards = filteredCards.filter((c) =>
            tags.some((tag) => c.tags.includes(tag))
          )
        }

        // Apply pagination
        const page = urlParams.page ?? 1
        const pageSize = urlParams.pageSize ?? 50
        const total = filteredCards.length
        const start = (page - 1) * pageSize
        const paginatedCards = filteredCards.slice(start, start + pageSize)

        return new PaginatedCards({
          cards: paginatedCards,
          total,
          page,
          pageSize,
          hasMore: start + pageSize < total,
        })
      })
    )
    .handle("get", ({ path }) =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        return yield* cardService.get(path.cardId as CardId).pipe(
          Effect.mapError(
            () =>
              new CardNotFoundError({
                cardId: path.cardId,
                message: `Card with id ${path.cardId} not found`,
              })
          )
        )
      })
    )
    .handle("create", ({ path, payload }) =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        const deckService = yield* DeckService

        // Verify deck exists
        yield* deckService.get(path.deckId as DeckId).pipe(
          Effect.mapError(
            () =>
              new DeckNotFoundError({
                deckId: path.deckId,
                message: `Deck with id ${path.deckId} not found`,
              })
          )
        )

        // Create card with deck ID and defaults
        return yield* cardService.create({
          deckId: path.deckId as DeckId,
          type: payload.type ?? "basic",
          front: payload.front,
          back: payload.back,
          audioFront: payload.audioFront,
          audioBack: payload.audioBack,
          image: payload.image,
          personalNote: payload.personalNote,
          tags: payload.tags,
        })
      })
    )
    .handle("update", ({ path, payload }) =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        return yield* cardService.update(path.cardId as CardId, payload).pipe(
          Effect.mapError(
            () =>
              new CardNotFoundError({
                cardId: path.cardId,
                message: `Card with id ${path.cardId} not found`,
              })
          )
        )
      })
    )
    .handle("delete", ({ path }) =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        yield* cardService.delete(path.cardId as CardId).pipe(
          Effect.mapError(
            () =>
              new CardNotFoundError({
                cardId: path.cardId,
                message: `Card with id ${path.cardId} not found`,
              })
          )
        )
      })
    )
)
