import { Effect } from "effect";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { isRouteErrorResponse, Link, useFetcher, useLoaderData, useRouteError } from "react-router";

import { DeckService, ReviewService } from "@serious/core";
import { CardId, DeckId, SessionStats } from "@serious/shared";
import type { Card, Deck, Rating } from "@serious/shared";

import type { Route } from "./+types/review";
import { routeAction, routeHandler } from "~/lib/effect/route.server";
import { FlashCard } from "~/components/flash-card";
import { RatingButtons } from "~/components/rating-buttons";
import { ReviewProgress } from "~/components/review-progress";
import { SessionSummary } from "~/components/session-summary";
import { speakText } from "~/lib/audio";

type ReviewState =
  | { status: "reviewing"; index: number; flipped: boolean; correct: number; wrong: number; newCards: number }
  | { status: "done"; correct: number; wrong: number; newCards: number; endTime: number };

type ReviewAction =
  | { type: "flip" }
  | { type: "rate"; rating: Rating; totalCards: number; cardState: string };

function reviewReducer(state: ReviewState, action: ReviewAction): ReviewState {
  if (state.status === "done") return state;

  switch (action.type) {
    case "flip":
      return { ...state, flipped: !state.flipped };
    case "rate": {
      const isCorrect = action.rating >= 2;
      const correct = state.correct + (isCorrect ? 1 : 0);
      const wrong = state.wrong + (isCorrect ? 0 : 1);
      const newCards = state.newCards + (action.cardState === "new" ? 1 : 0);
      const nextIndex = state.index + 1;
      if (nextIndex >= action.totalCards) {
        return { status: "done", correct, wrong, newCards, endTime: Date.now() };
      }
      return { ...state, correct, wrong, newCards, index: nextIndex, flipped: false };
    }
  }
}

export const meta: Route.MetaFunction = () => [
  { title: "Review - Serious" },
];

export const loader = routeHandler((args) =>
  Effect.gen(function* () {
    const deckId = DeckId.make(args.params.id!);
    const deckService = yield* DeckService;
    const reviewService = yield* ReviewService;

    const deck = yield* deckService.get(deckId);
    const dueCards = yield* reviewService.getDueCards(deckId);

    return {
      deck: deck as Deck,
      cards: dueCards as Card[],
    };
  }),
);

export const action = routeAction((args) =>
  Effect.gen(function* () {
    const formData = yield* Effect.promise(() => args.request.formData());
    const intent = formData.get("intent") as string;

    if (intent === "review") {
      const reviewService = yield* ReviewService;
      const cardIdRaw = formData.get("cardId");
      const ratingRaw = Number(formData.get("rating"));
      if (!cardIdRaw || ![1, 2, 3, 4].includes(ratingRaw)) {
        return { ok: false };
      }
      const result = yield* reviewService.submitReview(
        CardId.make(cardIdRaw as string),
        ratingRaw as Rating,
      );
      return { scheduledDays: result.scheduledDays };
    }

    if (intent === "record-session") {
      const reviewService = yield* ReviewService;
      const stats = new SessionStats({
        reviewed: Number(formData.get("reviewed")),
        correct: Number(formData.get("correct")),
        wrong: Number(formData.get("wrong")),
        newCards: Number(formData.get("newCards") ?? 0),
        timeSpentSeconds: Number(formData.get("timeSpentSeconds")),
        startedAt: new Date(formData.get("startedAt") as string),
        endedAt: new Date(),
      });
      yield* reviewService.recordSession(stats);
      return { ok: true };
    }

    return { ok: false };
  }),
);

export default function Review() {
  const { deck, cards } = useLoaderData<typeof loader>();
  const reviewFetcher = useFetcher();
  const sessionFetcher = useFetcher();

  const [state, dispatch] = useReducer(reviewReducer, {
    status: "reviewing",
    index: 0,
    flipped: false,
    correct: 0,
    wrong: 0,
    newCards: 0,
  });
  const startedAt = useRef(new Date().toISOString());
  const startTime = useRef(Date.now());

  const isDone = state.status === "done";
  const currentCard = state.status === "reviewing" ? cards[state.index] : undefined;
  const isFlipped = state.status === "reviewing" && state.flipped;

  const handleFlip = useCallback(() => {
    dispatch({ type: "flip" });
  }, []);

  // Use ref to avoid stale closures in keyboard handler
  const handleRateRef = useRef<(rating: Rating) => void>(() => {});
  handleRateRef.current = (rating: Rating) => {
    if (!currentCard || isDone || !isFlipped) return;

    // Submit review via dedicated fetcher
    reviewFetcher.submit(
      { intent: "review", cardId: currentCard.id, rating: String(rating) },
      { method: "post" },
    );

    // Check if this is the last card — record session via separate fetcher
    if (state.status === "reviewing" && state.index + 1 >= cards.length) {
      const isCorrect = rating >= 2;
      const newCards = state.newCards + (currentCard.state === "new" ? 1 : 0);
      const elapsed = Math.round((Date.now() - startTime.current) / 1000);
      sessionFetcher.submit(
        {
          intent: "record-session",
          reviewed: String(state.index + 1),
          correct: String(state.correct + (isCorrect ? 1 : 0)),
          wrong: String(state.wrong + (isCorrect ? 0 : 1)),
          newCards: String(newCards),
          timeSpentSeconds: String(elapsed),
          startedAt: startedAt.current,
        },
        { method: "post" },
      );
    }

    dispatch({ type: "rate", rating, totalCards: cards.length, cardState: currentCard.state });
  };

  const handleRate = useCallback((rating: Rating) => {
    handleRateRef.current(rating);
  }, []);

  // Keyboard shortcuts — stable ref avoids listener churn
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      }
      if (e.key === "1") handleRateRef.current(1);
      if (e.key === "2") handleRateRef.current(2);
      if (e.key === "3") handleRateRef.current(3);
      if (e.key === "4") handleRateRef.current(4);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip]);

  // TTS for current card
  const handleSpeak = useCallback(() => {
    if (currentCard) {
      speakText(currentCard.front, deck.targetLanguage);
    }
  }, [currentCard, deck.targetLanguage]);

  if (cards.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-balance">No cards due</h1>
        <p className="mt-2 text-muted-foreground">
          All caught up! Come back later.
        </p>
        <div className="mt-4 flex gap-4">
          <Link
            to={`/decks/${deck.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to deck
          </Link>
          <Link
            to={`/decks/${deck.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Add more cards
          </Link>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <SessionSummary
        reviewed={state.correct + state.wrong}
        correct={state.correct}
        wrong={state.wrong}
        timeSpentSeconds={Math.round((state.endTime - startTime.current) / 1000)}
        deckId={deck.id}
        deckName={deck.name}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <ReviewProgress
        current={(state.status === "reviewing" ? state.index : 0) + 1}
        total={cards.length}
        correct={state.correct}
        wrong={state.wrong}
      />

      {currentCard && (
        <div className="mt-8 w-full max-w-lg">
          <FlashCard
            front={currentCard.front}
            back={currentCard.back}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onSpeak={handleSpeak}
          />

          {isFlipped && (
            <div className="mt-6">
              <RatingButtons onRate={handleRate} />
            </div>
          )}

          {!isFlipped && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Press <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Space</kbd> to reveal
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold">
        {is404 ? "Deck not found" : "Review unavailable"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {is404
          ? "This deck may have been deleted."
          : "Something went wrong loading the review session."}
      </p>
      <Link
        to="/"
        className="mt-4 text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to home
      </Link>
    </div>
  );
}
