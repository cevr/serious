import { For, Show, createMemo } from "solid-js"
import type { RetentionDataPoint } from "@serious/api"
import "./RetentionChart.css"

interface RetentionChartProps {
  data: RetentionDataPoint[]
}

export function RetentionChart(props: RetentionChartProps) {
  const chartData = createMemo(() => {
    if (props.data.length === 0) return []

    // Last 14 days for display
    const last14 = props.data.slice(-14)
    const maxReviews = Math.max(...last14.map((d) => d.reviews), 1)

    return last14.map((d) => ({
      ...d,
      retentionHeight: d.retention * 100,
      reviewsHeight: (d.reviews / maxReviews) * 100,
      displayDate: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }))
  })

  const averageRetention = createMemo(() => {
    const data = props.data.filter((d) => d.reviews > 0)
    if (data.length === 0) return 0
    const sum = data.reduce((acc, d) => acc + d.retention, 0)
    return Math.round((sum / data.length) * 100)
  })

  return (
    <div class="retention-chart">
      <div class="retention-chart__header">
        <h3 class="retention-chart__title">Retention Rate</h3>
        <Show when={props.data.length > 0}>
          <span class="retention-chart__average tabular-nums">
            {averageRetention()}% avg
          </span>
        </Show>
      </div>

      <Show
        when={chartData().length > 0}
        fallback={
          <div class="retention-chart__empty">
            <p>No review data yet. Complete some reviews to see your retention rate.</p>
          </div>
        }
      >
        <div class="retention-chart__container">
          <div class="retention-chart__y-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div class="retention-chart__bars">
            <For each={chartData()}>
              {(day) => (
                <div class="retention-chart__bar-group">
                  <div class="retention-chart__bar-container">
                    <div
                      class="retention-chart__bar retention-chart__bar--retention"
                      style={{ height: `${day.retentionHeight}%` }}
                      title={`${Math.round(day.retention * 100)}% retention`}
                    />
                    <div
                      class="retention-chart__bar retention-chart__bar--reviews"
                      style={{ height: `${day.reviewsHeight}%` }}
                      title={`${day.reviews} reviews`}
                    />
                  </div>
                  <span class="retention-chart__label">{day.displayDate}</span>
                </div>
              )}
            </For>
          </div>
        </div>

        <div class="retention-chart__legend">
          <div class="retention-chart__legend-item">
            <span class="retention-chart__legend-color retention-chart__legend-color--retention" />
            <span>Retention</span>
          </div>
          <div class="retention-chart__legend-item">
            <span class="retention-chart__legend-color retention-chart__legend-color--reviews" />
            <span>Review Volume</span>
          </div>
        </div>
      </Show>
    </div>
  )
}
