import type { JSX } from "solid-js"
import "./StatCard.css"

interface StatCardProps {
  label: string
  value: string | number
  icon?: JSX.Element
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}

export function StatCard(props: StatCardProps) {
  return (
    <div class="stat-card">
      <div class="stat-card__header">
        <span class="stat-card__label">{props.label}</span>
        {props.icon && <span class="stat-card__icon">{props.icon}</span>}
      </div>
      <div class="stat-card__value tabular-nums">{props.value}</div>
      {props.trendValue && (
        <div class={`stat-card__trend stat-card__trend--${props.trend ?? "neutral"}`}>
          {props.trend === "up" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          )}
          {props.trend === "down" && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              <polyline points="17 18 23 18 23 12" />
            </svg>
          )}
          <span>{props.trendValue}</span>
        </div>
      )}
    </div>
  )
}
