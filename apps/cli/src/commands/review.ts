import { Args, Command, Options } from "@effect/cli"
import { Console, Effect, Option } from "effect"
import { ReviewService, DeckService } from "@serious/core"
import type { Rating } from "@serious/shared"

const deckArg = Args.text({ name: "deck" }).pipe(Args.optional)
const limitOpt = Options.integer("limit").pipe(
  Options.withAlias("n"),
  Options.withDescription("Maximum number of cards to review"),
  Options.withDefault(20)
)

export const reviewCommand = Command.make(
  "review",
  { deck: deckArg, limit: limitOpt },
  ({ deck, limit }) =>
    Effect.gen(function* () {
      const reviewService = yield* ReviewService
      const deckService = yield* DeckService

      // Get deck ID
      let deckId: string
      if (Option.isSome(deck)) {
        deckId = deck.value
      } else {
        // Use first deck if none specified
        const decks = yield* deckService.getAll()
        if (decks.length === 0) {
          yield* Console.log("No decks found. Create one with: srs deck create <name>")
          return
        }
        deckId = decks[0]!.id
      }

      // Get due cards
      const cards = yield* reviewService.getDueCards(deckId as any, limit)

      if (cards.length === 0) {
        yield* Console.log("No cards due for review! Great job!")
        return
      }

      yield* Console.log(`${cards.length} cards due for review.`)
      yield* Console.log("")
      yield* Console.log("For each card, rate your recall:")
      yield* Console.log("  1 = Again (forgot)")
      yield* Console.log("  2 = Hard (difficult to recall)")
      yield* Console.log("  3 = Good (recalled with effort)")
      yield* Console.log("  4 = Easy (instant recall)")
      yield* Console.log("")

      let reviewed = 0
      let correct = 0
      const startTime = Date.now()

      for (const card of cards) {
        yield* Console.log(`--- Card ${reviewed + 1}/${cards.length} ---`)
        yield* Console.log("")

        // Show front
        const front = JSON.parse(card.front)
        yield* Console.log(`Q: ${front.text ?? front}`)
        yield* Console.log("")
        yield* Console.log("(Press Enter to reveal answer)")

        // Wait for enter (in a real CLI we'd use readline)
        // For now, just show the answer
        const back = JSON.parse(card.back)
        yield* Console.log("")
        yield* Console.log(`A: ${back.text ?? back}`)
        yield* Console.log("")

        // In a real implementation, we'd prompt for rating
        // For now, default to "Good" (3)
        const rating: Rating = 3

        yield* reviewService.submitReview(card.id, rating)
        reviewed++
        if (rating >= 3) correct++

        yield* Console.log(`Rated: ${rating === 1 ? "Again" : rating === 2 ? "Hard" : rating === 3 ? "Good" : "Easy"}`)
        yield* Console.log("")
      }

      const timeSpent = Math.round((Date.now() - startTime) / 1000)

      yield* Console.log("--- Session Complete ---")
      yield* Console.log("")
      yield* Console.log(`  Reviewed:  ${reviewed} cards`)
      yield* Console.log(`  Correct:   ${correct} (${Math.round((correct / reviewed) * 100)}%)`)
      yield* Console.log(`  Time:      ${timeSpent}s`)
    })
)
