import { Clock, Effect } from "effect";
import { Link, useLoaderData } from "react-router";

import { DeckService, ReviewService } from "@serious/core";
import type { DailyProgress, DeckStats } from "@serious/shared";

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
    const avgRetention =
      allStats.length > 0
        ? allStats.reduce((sum, s) => sum + s.retentionRate, 0) / allStats.length
        : 0;
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
  } = useLoaderData<typeof loader>();

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

      <h1 className="mt-6 text-2xl font-bold tracking-tight">Statistics</h1>

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
                  <span className="font-medium">{ds.deckId}</span>
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
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold">Stats unavailable</h1>
      <p className="mt-2 text-muted-foreground">
        Something went wrong loading statistics.
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
