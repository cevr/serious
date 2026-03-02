import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { CardService, DatabaseService, DeckService } from "@serious/core"
import { SeriousApi, CardNotFoundError, DeckNotFoundError, PaginatedCards } from "@serious/api"

export const CardRoutesLive = HttpApiBuilder.group(SeriousApi, "cards", (handlers) =>
  handlers
    .handle("listByDeck", ({ path, urlParams }) =>
      Effect.gen(function* () {
        const db = yield* DatabaseService
        const deckService = yield* DeckService

        // Verify deck exists
        yield* deckService.get(path.deckId).pipe(
          Effect.mapError(
            () =>
              new DeckNotFoundError({
                deckId: path.deckId,
                message: `Deck with id ${path.deckId} not found`,
              })
          )
        )

        const page = urlParams.page ?? 1
        const pageSize = urlParams.pageSize ?? 50
        const tags = urlParams.tags
          ? urlParams.tags.split(",").map((t) => t.trim())
          : undefined

        const result = yield* db.getFilteredCards({
          deckId: path.deckId,
          state: urlParams.state,
          search: urlParams.search,
          tags,
          page,
          pageSize,
        })

        return new PaginatedCards({
          cards: result.cards,
          total: result.total,
          page,
          pageSize,
          hasMore: page * pageSize < result.total,
        })
      })
    )
    .handle("get", ({ path }) =>
      Effect.gen(function* () {
        const cardService = yield* CardService
        return yield* cardService.get(path.cardId).pipe(
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
        yield* deckService.get(path.deckId).pipe(
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
          deckId: path.deckId,
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
        return yield* cardService.update(path.cardId, payload).pipe(
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
        yield* cardService.delete(path.cardId).pipe(
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
