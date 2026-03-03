import { Effect } from "effect";
import type { LoaderFunctionArgs } from "react-router";

import { AppRuntime, handleLoaderError } from "./runtime.server";

/**
 * Create a route loader/action from an Effect.
 * Services are provided by AppRuntime (CoreLive + platform).
 */
function routeEffect<A>(
  body: (args: LoaderFunctionArgs) => Effect.Effect<A, any, any>,
) {
  return async (args: LoaderFunctionArgs): Promise<A> => {
    const exit = await AppRuntime.runPromiseExit(body(args));

    if (exit._tag === "Success") {
      return exit.value;
    }

    handleLoaderError(exit.cause);
  };
}

export const routeHandler = routeEffect;
export { routeHandler as routeAction };
