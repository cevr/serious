import type { Rating } from "@serious/shared"
import "./RatingButtons.css"

interface RatingButtonsProps {
  onRate: (rating: Rating) => void
  disabled?: boolean
}

const ratings: Array<{ value: Rating; label: string; shortcut: string; description: string }> = [
  { value: 1, label: "Again", shortcut: "1", description: "Complete blackout" },
  { value: 2, label: "Hard", shortcut: "2", description: "Struggled to recall" },
  { value: 3, label: "Good", shortcut: "3", description: "Correct with effort" },
  { value: 4, label: "Easy", shortcut: "4", description: "Instant recall" },
]

export function RatingButtons(props: RatingButtonsProps) {
  return (
    <div class="rating-buttons" role="group" aria-label="Rate your recall">
      {ratings.map((r) => (
        <button
          type="button"
          class={`rating-btn rating-btn--${r.value}`}
          onClick={() => props.onRate(r.value)}
          disabled={props.disabled}
          aria-label={`${r.label}: ${r.description}`}
        >
          <span class="rating-btn__label">{r.label}</span>
          <span class="rating-btn__shortcut">{r.shortcut}</span>
        </button>
      ))}
    </div>
  )
}
