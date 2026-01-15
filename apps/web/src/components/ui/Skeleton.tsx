import "./Skeleton.css"

interface SkeletonProps {
  width?: string
  height?: string
  class?: string
}

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class={`skeleton ${props.class ?? ""}`}
      style={{
        width: props.width,
        height: props.height,
      }}
      aria-hidden="true"
    />
  )
}

export function SkeletonText(props: { lines?: number; class?: string }) {
  const lines = props.lines ?? 3
  return (
    <div class={`skeleton-text ${props.class ?? ""}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          class="skeleton skeleton--text"
          style={{ width: i === lines - 1 ? "60%" : "100%" }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-card__header">
        <Skeleton width="60%" height="1.5rem" />
        <Skeleton width="80px" height="1rem" />
      </div>
      <div class="skeleton-card__body">
        <SkeletonText lines={2} />
      </div>
    </div>
  )
}
