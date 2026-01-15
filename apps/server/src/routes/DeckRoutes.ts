import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { DeckService } from "@serious/core"
import { SeriousApi, DeckNotFoundError } from "@serious/api"
import type { DeckId } from "@serious/shared"

export const DeckRoutesLive = HttpApiBuilder.group(SeriousApi, "decks", (handlers) =>
  handlers
    .handle("list", () =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        return yield* deckService.getAll()
      })
    )
    .handle("get", ({ path }) =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        return yield* deckService.get(path.deckId as DeckId).pipe(
          Effect.mapError(
            () =>
              new DeckNotFoundError({
                deckId: path.deckId,
                message: `Deck with id ${path.deckId} not found`,
              })
          )
        )
      })
    )
    .handle("stats", ({ path }) =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        return yield* deckService.getStats(path.deckId as DeckId).pipe(
          Effect.mapError(
            () =>
              new DeckNotFoundError({
                deckId: path.deckId,
                message: `Deck with id ${path.deckId} not found`,
              })
          )
        )
      })
    )
    .handle("create", ({ payload }) =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        return yield* deckService.create(payload)
      })
    )
    .handle("update", ({ path, payload }) =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        return yield* deckService.update(path.deckId as DeckId, payload).pipe(
          Effect.mapError(
            () =>
              new DeckNotFoundError({
                deckId: path.deckId,
                message: `Deck with id ${path.deckId} not found`,
              })
          )
        )
      })
    )
    .handle("delete", ({ path }) =>
      Effect.gen(function* () {
        const deckService = yield* DeckService
        yield* deckService.delete(path.deckId as DeckId).pipe(
          Effect.mapError(
            () =>
              new DeckNotFoundError({
                deckId: path.deckId,
                message: `Deck with id ${path.deckId} not found`,
              })
          )
        )
      })
    )
)
