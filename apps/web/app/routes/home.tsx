import { Effect } from "effect";
import { Link, useLoaderData } from "react-router";
import type { Route } from "./+types/home";

import { DeckService } from "@serious/core";
import { CreateDeckInput } from "@serious/shared";
import type { Deck, DeckStats } from "@serious/shared";

import { routeAction, routeHandler } from "~/lib/effect/route.server";
import { DeckCard } from "~/components/deck-card";
import { CreateDeckDialog } from "~/components/create-deck-dialog";

export const loader = routeHandler(function* () {
  const deckService = yield* DeckService;
  const decks = yield* deckService.getAll();

  const stats = yield* Effect.all(
    decks.map((deck) => deckService.getStats(deck.id)),
    { concurrency: "unbounded" },
  );

  return {
    decks: decks as Deck[],
    stats: stats as DeckStats[],
  };
});

export const action = routeAction(function* (_resume, args) {
  const formData = yield* Effect.promise(() => args.request.formData());
  const intent = formData.get("intent") as string;

  if (intent === "create-deck") {
    const name = formData.get("name");
    const targetLanguage = formData.get("targetLanguage");
    const nativeLanguage = formData.get("nativeLanguage");
    if (!name || !targetLanguage || !nativeLanguage) {
      return { ok: false };
    }
    const deckService = yield* DeckService;
    const input = new CreateDeckInput({
      name: name as string,
      targetLanguage: targetLanguage as string,
      nativeLanguage: nativeLanguage as string,
      description: (formData.get("description") as string) || undefined,
    });
    yield* deckService.create(input);
    return { ok: true };
  }

  return { ok: false };
});

export default function Home() {
  const { decks, stats } = useLoaderData<typeof loader>();

  const statsMap = new Map(stats.map((s) => [s.deckId, s]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Serious</h1>
          <p className="mt-1 text-muted-foreground">
            Spaced repetition for language learning
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/stats"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Stats
          </Link>
          <CreateDeckDialog />
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-lg text-muted-foreground">No decks yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first deck to start learning
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              stats={statsMap.get(deck.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
