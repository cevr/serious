import { Show } from "solid-js"
import { Badge } from "@/components/ui"
import type { Card } from "@serious/shared"
import "./CardItem.css"

interface CardItemProps {
  card: Card
  onClick?: () => void
}

const stateVariants = {
  new: "new",
  learning: "learning",
  review: "review",
  relearning: "relearning",
} as const

const typeLabels = {
  basic: "Basic",
  "minimal-pair": "Min. Pair",
  cloze: "Cloze",
  "image-word": "Image",
  ipa: "IPA",
  spelling: "Spelling",
}

export function CardItem(props: CardItemProps) {
  const dueDate = () => {
    const due = new Date(props.card.due)
    const now = new Date()
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return "Due now"
    if (diffDays === 1) return "Due tomorrow"
    return `Due in ${diffDays} days`
  }

  return (
    <button
      class="card-item"
      onClick={props.onClick}
      type="button"
    >
      <div class="card-item__content">
        <div class="card-item__front">{props.card.front}</div>
        <div class="card-item__separator" aria-hidden="true" />
        <div class="card-item__back">{props.card.back}</div>
      </div>

      <div class="card-item__meta">
        <Badge variant={stateVariants[props.card.state]}>{props.card.state}</Badge>
        <span class="card-item__type">{typeLabels[props.card.type]}</span>
        <span class="card-item__due">{dueDate()}</span>
      </div>

      <Show when={props.card.tags.length > 0}>
        <div class="card-item__tags">
          {props.card.tags.slice(0, 3).map((tag) => (
            <span class="card-item__tag">{tag}</span>
          ))}
          <Show when={props.card.tags.length > 3}>
            <span class="card-item__tag card-item__tag--more">+{props.card.tags.length - 3}</span>
          </Show>
        </div>
      </Show>
    </button>
  )
}
