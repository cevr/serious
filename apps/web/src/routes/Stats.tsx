import { Suspense, Show } from "solid-js"
import { Skeleton } from "@/components/ui"
import { StatCard, RetentionChart, StreakDisplay } from "@/components/stats"
import { statsStore } from "@/stores"
import "./Stats.css"

export function Stats() {
  return (
    <div class="stats-page">
      <header class="stats-page__header">
        <h1 class="stats-page__title">Statistics</h1>
        <p class="stats-page__subtitle">Track your learning progress and retention</p>
      </header>

      <Suspense
        fallback={
          <div class="stats-page__loading">
            <div class="stats-page__stat-grid">
              <Skeleton height="120px" />
              <Skeleton height="120px" />
              <Skeleton height="120px" />
              <Skeleton height="120px" />
            </div>
          </div>
        }
      >
        <Show when={statsStore.aggregate()}>
          {(agg) => (
            <>
              <section class="stats-page__overview">
                <div class="stats-page__stat-grid">
                  <StatCard
                    label="Total Cards"
                    value={agg().totalCards}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Due Today"
                    value={agg().totalDue}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="New Cards"
                    value={agg().totalNew}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Total Decks"
                    value={agg().deckCount}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                    }
                  />
                </div>
              </section>

              <section class="stats-page__streak">
                <StreakDisplay
                  currentStreak={agg().currentStreak}
                  longestStreak={agg().longestStreak}
                  dailyProgress={statsStore.daily() ?? []}
                />
              </section>

              <section class="stats-page__retention">
                <RetentionChart data={statsStore.retention() ?? []} />
              </section>
            </>
          )}
        </Show>
      </Suspense>
    </div>
  )
}
