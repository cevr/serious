import { Args, Command, Options } from "@effect/cli"
import { Console, Effect } from "effect"
import { DeckService } from "@serious/core"
import { CreateDeckInput, DeckId } from "@serious/shared"

// srs deck list
const listCommand = Command.make("list", {}, () =>
  Effect.gen(function* () {
    const deckService = yield* DeckService
    const decks = yield* deckService.getAll()

    if (decks.length === 0) {
      yield* Console.log("No decks found. Create one with: srs deck create <name>")
      return
    }

    yield* Console.log("Decks:")
    yield* Console.log("")

    for (const deck of decks) {
      const stats = yield* deckService.getStats(deck.id)
      yield* Console.log(`  ${deck.name}`)
      yield* Console.log(`    ID: ${deck.id}`)
      yield* Console.log(`    Language: ${deck.targetLanguage} (from ${deck.nativeLanguage})`)
      yield* Console.log(`    Cards: ${stats.totalCards} (${stats.dueToday} due today)`)
      yield* Console.log(`    Stage: ${deck.stage}`)
      yield* Console.log("")
    }
  })
)

// srs deck create <name>
const nameArg = Args.text({ name: "name" })
const targetLangOpt = Options.text("target").pipe(
  Options.withAlias("t"),
  Options.withDescription("Target language code (e.g., es, ja, fr)"),
  Options.withDefault("es")
)
const nativeLangOpt = Options.text("native").pipe(
  Options.withAlias("n"),
  Options.withDescription("Native language code (e.g., en)"),
  Options.withDefault("en")
)

const createCommand = Command.make(
  "create",
  { name: nameArg, target: targetLangOpt, native: nativeLangOpt },
  ({ name, target, native }) =>
    Effect.gen(function* () {
      const deckService = yield* DeckService

      const input = new CreateDeckInput({
        name,
        targetLanguage: target,
        nativeLanguage: native,
      })

      const deck = yield* deckService.create(input)

      yield* Console.log(`Created deck: ${deck.name}`)
      yield* Console.log(`  ID: ${deck.id}`)
      yield* Console.log(`  Language: ${deck.targetLanguage} (from ${deck.nativeLanguage})`)
    })
)

// srs deck delete <id>
const idArg = Args.text({ name: "id" })

const deleteCommand = Command.make("delete", { id: idArg }, ({ id }) =>
  Effect.gen(function* () {
    const deckService = yield* DeckService

    yield* deckService.delete(DeckId.make(id)).pipe(
      Effect.catchTag("DeckNotFound", () =>
        Effect.gen(function* () {
          yield* Console.error(`Deck not found: ${id}`)
          yield* Effect.fail(new Error("Deck not found"))
        })
      )
    )

    yield* Console.log(`Deleted deck: ${id}`)
  })
)

// srs deck
export const deckCommand = Command.make("deck").pipe(
  Command.withSubcommands([listCommand, createCommand, deleteCommand])
)
