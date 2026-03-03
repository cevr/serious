import { Effect } from "effect";
import { useEffect, useRef } from "react";
import { isRouteErrorResponse, Link, redirect, useFetcher, useLoaderData, useRouteError } from "react-router";
import type { Route } from "./+types/deck";

import { CardService, DeckService, ImportService } from "@serious/core";
import { CardId, CreateCardInput, DeckId } from "@serious/shared";
import type { Card, Deck, DeckStats } from "@serious/shared";

import { routeAction, routeHandler } from "~/lib/effect/route.server";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card as CardUI,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { StatCard } from "~/components/stat-card";

export const loader = routeHandler((args) =>
  Effect.gen(function* () {
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
  }),
);

export const action = routeAction((args) =>
  Effect.gen(function* () {
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
      const cardIdRaw = formData.get("cardId");
      if (!cardIdRaw) return { ok: false };
      yield* cardService.delete(CardId.make(cardIdRaw as string));
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
  }),
);

export default function DeckDetail() {
  const { deck, cards, stats } = useLoaderData<typeof loader>();
  const deleteDeckFetcher = useFetcher();

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
            <Button render={<Link to={`/decks/${deck.id}/review`} />}>
              Review ({stats.dueToday})
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
              Delete
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete deck?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{deck.name}" and all its cards.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <deleteDeckFetcher.Form method="post">
                  <input type="hidden" name="intent" value="delete-deck" />
                  <input type="hidden" name="deckId" value={deck.id} />
                  <AlertDialogAction type="submit">Delete</AlertDialogAction>
                </deleteDeckFetcher.Form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Stats summary */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.totalCards} />
        <StatCard label="New" value={stats.newCount} />
        <StatCard label="Learning" value={stats.learningCount} />
        <StatCard label="Due today" value={stats.dueToday} />
      </div>

      {/* Import */}
      <ImportForm deckId={deck.id} />

      {/* Add card */}
      <AddCardForm deckId={deck.id} />

      {/* Card list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">
          Cards ({cards.length})
        </h2>
        <div className="mt-2 space-y-2">
          {cards.map((card) => (
            <CardRow key={card.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ImportForm({ deckId }: { deckId: string }) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">Import</h2>
      <fetcher.Form method="post" encType="multipart/form-data" className="mt-2 flex items-center gap-2">
        <input type="hidden" name="intent" value="import-apkg" />
        <input type="hidden" name="deckId" value={deckId} />
        <input
          type="file"
          name="file"
          accept=".apkg"
          aria-label="Choose .apkg file to import"
          className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
          {isSubmitting ? "Importing..." : "Import .apkg"}
        </Button>
      </fetcher.Form>
    </div>
  );
}

function AddCardForm({ deckId }: { deckId: string }) {
  const fetcher = useFetcher();
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form on successful submission
  useEffect(() => {
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok && fetcher.state === "idle") {
      formRef.current?.reset();
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">Add Card</h2>
      <fetcher.Form ref={formRef} method="post" className="mt-2 flex gap-2">
        <input type="hidden" name="intent" value="create-card" />
        <input type="hidden" name="deckId" value={deckId} />
        <Input
          name="front"
          placeholder="Front"
          required
          aria-label="Card front"
          className="flex-1"
        />
        <Input
          name="back"
          placeholder="Back"
          required
          aria-label="Card back"
          className="flex-1"
        />
        <Button type="submit" size="sm">
          Add
        </Button>
      </fetcher.Form>
    </div>
  );
}

function CardRow({ card }: { card: Card }) {
  const fetcher = useFetcher();

  return (
    <CardUI>
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
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  aria-label="Delete card"
                />
              }
            >
              ×
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete card?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this card.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <fetcher.Form method="post">
                  <input type="hidden" name="intent" value="delete-card" />
                  <input type="hidden" name="cardId" value={card.id} />
                  <AlertDialogAction type="submit">Delete</AlertDialogAction>
                </fetcher.Form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
    </CardUI>
  );
}


export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">
        {is404 ? "Deck not found" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {is404
          ? "This deck may have been deleted or doesn\u2019t exist."
          : "An unexpected error occurred."}
      </p>
      <Link
        to="/"
        className="mt-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to home
      </Link>
    </div>
  );
}
