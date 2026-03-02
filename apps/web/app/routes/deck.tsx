import { Effect } from "effect";
import { Link, redirect, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/deck";

import { CardService, DeckService, ImportService } from "@serious/core";
import { CreateCardInput, DeckId } from "@serious/shared";
import type { Card, Deck, DeckStats } from "@serious/shared";

import { routeAction, routeHandler } from "~/lib/effect/route.server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card as CardUI,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const loader = routeHandler(function* (_resume, args) {
  const deckId = DeckId.make(args.params.id!);
  const deckService = yield* DeckService;
  const cardService = yield* CardService;

  const deck = yield* deckService.get(deckId);
  const cards = yield* cardService.getByDeck(deckId);
  const stats = yield* deckService.getStats(deckId);

  return {
    deck: deck as Deck,
    cards: cards as Card[],
    stats: stats as DeckStats,
  };
});

export const action = routeAction(function* (_resume, args) {
  const formData = yield* Effect.promise(() => args.request.formData());
  const intent = formData.get("intent") as string;

  if (intent === "delete-deck") {
    const deckId = DeckId.make(formData.get("deckId") as string);
    const deckService = yield* DeckService;
    yield* deckService.delete(deckId);
    throw redirect("/");
  }

  if (intent === "create-card") {
    const cardService = yield* CardService;
    const input = new CreateCardInput({
      deckId: DeckId.make(formData.get("deckId") as string),
      type: "basic",
      front: formData.get("front") as string,
      back: formData.get("back") as string,
    });
    yield* cardService.create(input);
    return { ok: true };
  }

  if (intent === "delete-card") {
    const cardService = yield* CardService;
    const cardId = formData.get("cardId") as string;
    yield* cardService.delete(cardId as any);
    return { ok: true };
  }

  if (intent === "import-apkg") {
    const importService = yield* ImportService;
    const deckId = DeckId.make(formData.get("deckId") as string);
    const file = formData.get("file") as File;
    const buffer = new Uint8Array(yield* Effect.promise(() => file.arrayBuffer()));
    const result = yield* importService.importApkg(buffer, deckId);
    return result;
  }

  return { ok: false };
});

export default function DeckDetail() {
  const { deck, cards, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back
        </Link>
      </div>

      <div className="mt-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{deck.name}</h1>
          {deck.description && (
            <p className="mt-1 text-muted-foreground">{deck.description}</p>
          )}
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">
              {deck.targetLanguage} → {deck.nativeLanguage}
            </Badge>
            <Badge variant="secondary">{deck.stage}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {stats.dueToday > 0 && (
            <Button asChild>
              <Link to={`/decks/${deck.id}/review`}>
                Review ({stats.dueToday})
              </Link>
            </Button>
          )}
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="delete-deck" />
            <input type="hidden" name="deckId" value={deck.id} />
            <Button type="submit" variant="destructive" size="sm">
              Delete
            </Button>
          </fetcher.Form>
        </div>
      </div>

      {/* Stats summary */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatBox label="Total" value={stats.totalCards} />
        <StatBox label="New" value={stats.newCount} />
        <StatBox label="Learning" value={stats.learningCount} />
        <StatBox label="Due today" value={stats.dueToday} />
      </div>

      {/* Import */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Import</h2>
        <fetcher.Form method="post" encType="multipart/form-data" className="mt-2 flex items-center gap-2">
          <input type="hidden" name="intent" value="import-apkg" />
          <input type="hidden" name="deckId" value={deck.id} />
          <input
            type="file"
            name="file"
            accept=".apkg"
            className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          <Button type="submit" size="sm" variant="secondary">
            Import .apkg
          </Button>
        </fetcher.Form>
      </div>

      {/* Add card */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Add Card</h2>
        <fetcher.Form method="post" className="mt-2 flex gap-2">
          <input type="hidden" name="intent" value="create-card" />
          <input type="hidden" name="deckId" value={deck.id} />
          <input
            name="front"
            placeholder="Front"
            required
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            name="back"
            placeholder="Back"
            required
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" size="sm">
            Add
          </Button>
        </fetcher.Form>
      </div>

      {/* Card list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">
          Cards ({cards.length})
        </h2>
        <div className="mt-2 space-y-2">
          {cards.map((card) => (
            <CardUI key={card.id}>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm font-normal">
                  <span className="font-medium">{card.front}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span>{card.back}</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={card.state === "new" ? "default" : "secondary"}
                  >
                    {card.state}
                  </Badge>
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="delete-card" />
                    <input type="hidden" name="cardId" value={card.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                    >
                      ×
                    </Button>
                  </fetcher.Form>
                </div>
              </CardHeader>
            </CardUI>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <CardUI>
      <CardContent className="p-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </CardUI>
  );
}
