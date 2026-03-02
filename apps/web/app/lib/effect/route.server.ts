import { Effect } from "effect";
import type { YieldWrap } from "effect/Utils";
import type { LoaderFunctionArgs } from "react-router";

import { runLoaderEffect } from "./runtime.server";

/**
 * Create a route loader from an Effect generator.
 *
 * Usage:
 *   export const loader = routeHandler(function* () {
 *     const decks = yield* DeckService
 *     return { decks: yield* decks.getAll() }
 *   })
 */
export function routeHandler<Eff extends YieldWrap<Effect.Effect<any, any, any>>, A>(
  body: (resume: Effect.Adapter) => Generator<Eff, A, never>,
) {
  return (_args: LoaderFunctionArgs): Promise<A> =>
    runLoaderEffect(Effect.gen(body));
}

/**
 * Create a route action from an Effect generator.
 *
 * Usage:
 *   export const action = routeAction(function* (args) {
 *     const formData = yield* Effect.promise(() => args.request.formData())
 *     ...
 *   })
 */
export function routeAction<Eff extends YieldWrap<Effect.Effect<any, any, any>>, A>(
  body: (
    resume: Effect.Adapter,
    args: LoaderFunctionArgs,
  ) => Generator<Eff, A, never>,
) {
  return (args: LoaderFunctionArgs): Promise<A> =>
    runLoaderEffect(Effect.gen((resume) => body(resume, args)));
}
