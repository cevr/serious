import { Effect } from "effect";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData, useNavigate } from "react-router";

import { DeckService, ReviewService } from "@serious/core";
import { CardId, DeckId, SessionStats } from "@serious/shared";
import type { Card, Deck, Rating } from "@serious/shared";

import { routeAction, routeHandler } from "~/lib/effect/route.server";
import { FlashCard } from "~/components/flash-card";
import { RatingButtons } from "~/components/rating-buttons";
import { ReviewProgress } from "~/components/review-progress";
import { SessionSummary } from "~/components/session-summary";
import { speakText } from "~/lib/audio";

export const loader = routeHandler(function* (_resume, args) {
  const deckId = DeckId.make(args.params.id!);
  const deckService = yield* DeckService;
  const reviewService = yield* ReviewService;

  const deck = yield* deckService.get(deckId);
  const dueCards = yield* reviewService.getDueCards(deckId, deck.reviewsPerDay);

  return {
    deck: deck as Deck,
    cards: dueCards as Card[],
  };
});

export const action = routeAction(function* (_resume, args) {
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
      timeSpentSeconds: Number(formData.get("timeSpentSeconds")),
      startedAt: new Date(formData.get("startedAt") as string),
      endedAt: new Date(),
    });
    yield* reviewService.recordSession(stats);
    return { ok: true };
  }

  return { ok: false };
});

export default function Review() {
  const { deck, cards } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [done, setDone] = useState(false);
  const startedAt = useRef(new Date().toISOString());
  const startTime = useRef(Date.now());

  const currentCard = cards[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!currentCard) return;

      // Submit review
      fetcher.submit(
        { intent: "review", cardId: currentCard.id, rating: String(rating) },
        { method: "post" },
      );

      // Track stats
      if (rating >= 3) {
        setCorrect((c) => c + 1);
      } else {
        setWrong((w) => w + 1);
      }

      // Next card
      if (currentIndex + 1 >= cards.length) {
        // Record session
        const elapsed = Math.round((Date.now() - startTime.current) / 1000);
        fetcher.submit(
          {
            intent: "record-session",
            reviewed: String(currentIndex + 1),
            correct: String(rating >= 3 ? correct + 1 : correct),
            wrong: String(rating < 3 ? wrong + 1 : wrong),
            timeSpentSeconds: String(elapsed),
            startedAt: startedAt.current,
          },
          { method: "post" },
        );
        setDone(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setIsFlipped(false);
      }
    },
    [currentCard, currentIndex, cards.length, correct, wrong, fetcher],
  );

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (done) return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!isFlipped) {
          handleFlip();
        }
      }

      if (isFlipped) {
        if (e.key === "1") handleRate(1);
        if (e.key === "2") handleRate(2);
        if (e.key === "3") handleRate(3);
        if (e.key === "4") handleRate(4);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, done, handleFlip, handleRate]);

  // TTS for current card
  const handleSpeak = useCallback(() => {
    if (currentCard) {
      speakText(currentCard.front, deck.targetLanguage);
    }
  }, [currentCard, deck.targetLanguage]);

  if (cards.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold">No cards due</h1>
        <p className="mt-2 text-muted-foreground">
          All caught up! Come back later.
        </p>
        <button
          onClick={() => navigate(`/decks/${deck.id}`)}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back to deck
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <SessionSummary
        reviewed={correct + wrong}
        correct={correct}
        wrong={wrong}
        timeSpentSeconds={Math.round((Date.now() - startTime.current) / 1000)}
        deckId={deck.id}
        deckName={deck.name}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <ReviewProgress
        current={currentIndex + 1}
        total={cards.length}
        correct={correct}
        wrong={wrong}
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
