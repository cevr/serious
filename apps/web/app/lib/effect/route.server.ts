import { Effect } from "effect";
import type { LoaderFunctionArgs } from "react-router";

import { AppRuntime, handleLoaderError } from "./runtime.server";

/**
 * Create a route loader from an Effect generator.
 * Services are provided by AppRuntime (CoreLive + platform).
 */
export function routeHandler<A>(
  body: (
    resume: Effect.Adapter,
    args: LoaderFunctionArgs,
  ) => Generator<any, A, any>,
) {
  return async (args: LoaderFunctionArgs): Promise<A> => {
    const effect = Effect.gen((resume) => body(resume, args));
    const exit = await AppRuntime.runPromiseExit(effect as Effect.Effect<A>);

    if (exit._tag === "Success") {
      return exit.value;
    }

    handleLoaderError(exit.cause);
  };
}

/**
 * Create a route action from an Effect generator.
 * Services are provided by AppRuntime (CoreLive + platform).
 */
export function routeAction<A>(
  body: (
    resume: Effect.Adapter,
    args: LoaderFunctionArgs,
  ) => Generator<any, A, any>,
) {
  return async (args: LoaderFunctionArgs): Promise<A> => {
    const effect = Effect.gen((resume) => body(resume, args));
    const exit = await AppRuntime.runPromiseExit(effect as Effect.Effect<A>);

    if (exit._tag === "Success") {
      return exit.value;
    }

    handleLoaderError(exit.cause);
  };
}
