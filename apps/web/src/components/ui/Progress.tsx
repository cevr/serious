import "./Progress.css"

interface ProgressProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  variant?: "default" | "success" | "warning" | "error"
}

export function Progress(props: ProgressProps) {
  const max = props.max ?? 100
  const percentage = Math.min(100, Math.max(0, (props.value / max) * 100))

  return (
    <div class={`progress progress--${props.variant ?? "default"}`}>
      {props.label && (
        <div class="progress__header">
          <span class="progress__label">{props.label}</span>
          {props.showValue && (
            <span class="progress__value tabular-nums">
              {props.value}/{max}
            </span>
          )}
        </div>
      )}
      <div class="progress__track" role="progressbar" aria-valuenow={props.value} aria-valuemax={max}>
        <div class="progress__fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
