import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { Cause, Effect, Exit, Layer, ManagedRuntime } from "effect";
import { data } from "react-router";

import {
  CardNotFound,
  CoreLive,
  DatabaseError,
  DeckNotFound,
  ImportError,
} from "@serious/core";

// --- Global Runtime ---

const AppLive = CoreLive.pipe(
  Layer.provide(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
);

export const AppRuntime = ManagedRuntime.make(AppLive);

// --- Error handling ---

export function handleLoaderError(cause: Cause.Cause<unknown>): never {
  if (Cause.isFailType(cause)) {
    const error = cause.error;

    if (error instanceof DeckNotFound) {
      throw data({ message: `Deck not found: ${error.deckId}` }, { status: 404 });
    }
    if (error instanceof CardNotFound) {
      throw data({ message: `Card not found: ${error.cardId}` }, { status: 404 });
    }
    if (error instanceof ImportError) {
      throw data({ message: error.message }, { status: 400 });
    }
    if (error instanceof DatabaseError) {
      throw data({ message: "Database error" }, { status: 500 });
    }
  }

  throw data(
    { message: "Internal Server Error" },
    { status: 500 },
  );
}

