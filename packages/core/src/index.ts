// Errors
export * from "./errors"

// Services
export { CardService } from "./services/Card"
export { DeckService } from "./services/Deck"
export { FsrsService, type ScheduledCard } from "./services/Fsrs"
export { ReviewService } from "./services/Review"

// Storage
export { DatabaseService } from "./storage/Database"

// Layer composition helper
import { Layer } from "effect"
import { CardService } from "./services/Card"
import { DeckService } from "./services/Deck"
import { FsrsService } from "./services/Fsrs"
import { ReviewService } from "./services/Review"
import { DatabaseService } from "./storage/Database"

/**
 * Base services layer - Database and FSRS algorithm
 */
const BaseLive = Layer.mergeAll(
  DatabaseService.Live,
  FsrsService.Live
)

/**
 * Card and Deck services - depend on base services
 */
const CardDeckLive = Layer.mergeAll(
  CardService.Live,
  DeckService.Live
).pipe(Layer.provide(BaseLive))

/**
 * Composed layer with all core services
 * Usage: Effect.provide(CoreLive)
 */
export const CoreLive = ReviewService.Live.pipe(
  Layer.provide(CardDeckLive),
  Layer.provide(BaseLive),
  Layer.provideMerge(CardDeckLive)
)

/**
 * Test layer for unit testing
 */
export const CoreTest = Layer.mergeAll(
  CardService.Test(),
  DeckService.Test(),
  ReviewService.Test,
  FsrsService.Test,
  DatabaseService.Test
)
