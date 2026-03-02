import { Args, Command } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { DeckService } from "@serious/core"
import { DeckId } from "@serious/shared"

const deckArg = Args.text({ name: "deck" }).pipe(Args.optional)

export const statsCommand = Command.make("stats", { deck: deckArg }, ({ deck }) =>
  Effect.gen(function* () {
    const deckService = yield* DeckService

    if (Option.isSome(deck)) {
      // Show stats for specific deck
      const deckId = DeckId.make(deck.value)
      const deckInfo = yield* deckService.get(deckId).pipe(
        Effect.catchTag("DeckNotFound", () =>
          Effect.gen(function* () {
            yield* Console.error(`Deck not found: ${deckId}`)
            return yield* Effect.fail(new Error("Deck not found"))
          })
        )
      )
      const stats = yield* deckService.getStats(deckId)

      yield* Console.log(`Stats for: ${deckInfo.name}`)
      yield* Console.log("")
      yield* Console.log(`  Total cards:    ${stats.totalCards}`)
      yield* Console.log(`  New:            ${stats.newCount}`)
      yield* Console.log(`  Learning:       ${stats.learningCount}`)
      yield* Console.log(`  Review:         ${stats.reviewCount}`)
      yield* Console.log(`  Due today:      ${stats.dueToday}`)
      yield* Console.log(`  Retention rate: ${(stats.retentionRate * 100).toFixed(1)}%`)
      yield* Console.log(`  Streak:         ${stats.streak} days`)
    } else {
      // Show aggregate stats
      const decks = yield* deckService.getAll()

      if (decks.length === 0) {
        yield* Console.log("No decks found.")
        return
      }

      let totalCards = 0
      let totalDue = 0
      let totalNew = 0

      yield* Console.log("Overall Statistics")
      yield* Console.log("")

      for (const d of decks) {
        const stats = yield* deckService.getStats(d.id)
        totalCards += stats.totalCards
        totalDue += stats.dueToday
        totalNew += stats.newCount

        yield* Console.log(`  ${d.name}: ${stats.totalCards} cards, ${stats.dueToday} due`)
      }

      yield* Console.log("")
      yield* Console.log(`  Total:  ${totalCards} cards across ${decks.length} decks`)
      yield* Console.log(`  Due:    ${totalDue} cards due today`)
      yield* Console.log(`  New:    ${totalNew} new cards`)
    }
  })
)
