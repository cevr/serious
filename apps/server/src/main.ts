import { HttpApiBuilder, HttpMiddleware, HttpServer } from "@effect/platform"
import { BunHttpServer, BunRuntime } from "@effect/platform-bun"
import { Effect, Layer } from "effect"
import { CoreLive } from "@serious/core"
import { SeriousApi } from "@serious/api"

import { DeckRoutesLive } from "./routes/DeckRoutes"
import { CardRoutesLive } from "./routes/CardRoutes"
import { ReviewRoutesLive } from "./routes/ReviewRoutes"
import { StatsRoutesLive } from "./routes/StatsRoutes"

// Compose all route handlers
const ApiLive = HttpApiBuilder.api(SeriousApi).pipe(
  Layer.provide(DeckRoutesLive),
  Layer.provide(CardRoutesLive),
  Layer.provide(ReviewRoutesLive),
  Layer.provide(StatsRoutesLive)
)

// Add CORS middleware for development
const CorsMiddleware = HttpMiddleware.cors({
  allowedOrigins: ["http://localhost:5173", "http://localhost:3000"],
  allowedMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,
})

// Create the HTTP server
const ServerLive = HttpApiBuilder.serve(CorsMiddleware).pipe(
  Layer.provide(ApiLive),
  Layer.provide(CoreLive),
  HttpServer.withLogAddress,
  Layer.provide(BunHttpServer.layer({ port: 3000 }))
)

// Run the server
Layer.launch(ServerLive).pipe(
  Effect.tapErrorCause(Effect.logError),
  BunRuntime.runMain
)
