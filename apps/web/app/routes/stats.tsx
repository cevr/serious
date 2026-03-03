import { Clock, Effect } from "effect";
import { isRouteErrorResponse, Link, useLoaderData, useRouteError } from "react-router";

import { DeckService, ReviewService } from "@serious/core";
import type { DailyProgress, Deck, DeckStats } from "@serious/shared";

import type { Route } from "./+types/stats";
import { routeHandler } from "~/lib/effect/route.server";
import { RetentionChart } from "~/components/retention-chart";
import { StatCard } from "~/components/stat-card";
import { StreakDisplay } from "~/components/streak-display";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export const meta: Route.MetaFunction = () => [
  { title: "Statistics - Serious" },
];

export const loader = routeHandler(() =>
  Effect.gen(function* () {
    const deckService = yield* DeckService;
    const reviewService = yield* ReviewService;

    const decks = yield* deckService.getAll();

    // Get stats for all decks
    const allStats = yield* Effect.all(
      decks.map((d) => deckService.getStats(d.id)),
      { concurrency: "unbounded" },
    );

    // Get daily progress for the last 30 days
    const today = new Date(yield* Clock.currentTimeMillis);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const from = thirtyDaysAgo.toISOString().split("T")[0]!;
    const to = today.toISOString().split("T")[0]!;

    const dailyProgress = yield* reviewService.getDailyProgressRange(from, to);

    // Aggregate stats
    const totalCards = allStats.reduce((sum, s) => sum + s.totalCards, 0);
    const totalDue = allStats.reduce((sum, s) => sum + s.dueToday, 0);

    // Weight retention by totalCards per deck
    const totalWeighted = allStats.reduce((sum, s) => sum + s.retentionRate * s.totalCards, 0);
    const avgRetention = totalCards > 0 ? totalWeighted / totalCards : 0;

    const maxStreak = allStats.reduce(
      (max, s) => Math.max(max, s.streak),
      0,
    );

    return {
      totalCards,
      totalDue,
      avgRetention,
      maxStreak,
      dailyProgress: dailyProgress as DailyProgress[],
      deckStats: allStats as DeckStats[],
      decks: decks as Deck[],
    };
  }),
);

export default function Stats() {
  const {
    totalCards,
    totalDue,
    avgRetention,
    maxStreak,
    dailyProgress,
    deckStats,
    decks,
  } = useLoaderData<typeof loader>();

  const deckNames = new Map(decks.map((d) => [d.id, d.name]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Home
        </Link>
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-balance">Statistics</h1>

      {/* Streak */}
      <div className="mt-6">
        <StreakDisplay streak={maxStreak} />
      </div>

      {/* Overview cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Cards" value={totalCards} />
        <StatCard label="Due Today" value={totalDue} />
        <StatCard
          label="Retention"
          value={`${Math.round(avgRetention * 100)}%`}
        />
        <StatCard label="Decks" value={deckStats.length} />
      </div>

      {/* Daily progress chart */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyProgress.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No review data yet. Start reviewing to see your progress.
              </p>
            ) : (
              <RetentionChart data={dailyProgress} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-deck breakdown */}
      {deckStats.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Per Deck</h2>
          <div className="mt-3 space-y-2">
            {deckStats.map((ds) => (
              <Card key={ds.deckId}>
                <CardContent className="flex items-center justify-between p-4">
                  <span className="font-medium">{deckNames.get(ds.deckId) ?? ds.deckId}</span>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{ds.totalCards} cards</span>
                    <span>{ds.dueToday} due</span>
                    <span>{Math.round(ds.retentionRate * 100)}% retention</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">
        {is404 ? "Not found" : "Stats unavailable"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {is404
          ? "This page doesn\u2019t exist."
          : "Something went wrong loading statistics."}
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
