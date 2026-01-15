import { Command } from "@effect/cli"
import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer } from "effect"
import { CoreLive } from "@serious/core"

// Import CLI commands
import { deckCommand } from "./commands/deck"
import { statsCommand } from "./commands/stats"
import { reviewCommand } from "./commands/review"

const command = Command.make("srs").pipe(
  Command.withSubcommands([deckCommand, statsCommand, reviewCommand])
)

const cli = Command.run(command, {
  name: "Serious",
  version: "0.0.1",
})

cli(process.argv).pipe(
  Effect.provide(CoreLive.pipe(Layer.provide(BunContext.layer))),
  BunRuntime.runMain
)
