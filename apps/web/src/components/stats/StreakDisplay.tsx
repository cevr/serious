import { For, createMemo } from "solid-js"
import type { DailyProgress } from "@serious/shared"
import "./StreakDisplay.css"

interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
  dailyProgress: DailyProgress[]
}

export function StreakDisplay(props: StreakDisplayProps) {
  // Generate last 7 days for display
  const weekData = createMemo(() => {
    const days: Array<{ date: string; dayLabel: string; hasActivity: boolean; reviews: number }> = []
    const today = new Date()

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]!
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" })

      const progress = props.dailyProgress.find((p) => p.date === dateStr)

      days.push({
        date: dateStr,
        dayLabel,
        hasActivity: (progress?.reviews ?? 0) > 0,
        reviews: progress?.reviews ?? 0,
      })
    }

    return days
  })

  return (
    <div class="streak-display">
      <div class="streak-display__header">
        <div class="streak-display__current">
          <span class="streak-display__flame" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c.5 3.5 1.5 5.5 3 7 1.5 1.5 2.5 3.5 2.5 5.5 0 4.14-3.36 7.5-7.5 7.5S2.5 18.64 2.5 14.5c0-2 1-4 2.5-5.5 1.5-1.5 2.5-3.5 3-7 0 0 1.5 2 2 3.5.5 1.5 1 2 2 2z" />
            </svg>
          </span>
          <div class="streak-display__value">
            <span class="streak-display__number tabular-nums">{props.currentStreak}</span>
            <span class="streak-display__label">day streak</span>
          </div>
        </div>
        <div class="streak-display__best">
          <span class="streak-display__best-label">Best</span>
          <span class="streak-display__best-value tabular-nums">{props.longestStreak} days</span>
        </div>
      </div>

      <div class="streak-display__week">
        <For each={weekData()}>
          {(day) => (
            <div
              class="streak-display__day"
              data-active={day.hasActivity ? "" : undefined}
              title={`${day.date}: ${day.reviews} reviews`}
            >
              <div class="streak-display__day-dot" />
              <span class="streak-display__day-label">{day.dayLabel}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
