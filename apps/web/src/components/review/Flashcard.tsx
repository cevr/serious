import { Show } from "solid-js"
import type { Card } from "@serious/shared"
import "./Flashcard.css"

interface FlashcardProps {
  card: Card
  flipped: boolean
  onFlip: () => void
}

export function Flashcard(props: FlashcardProps) {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault()
      props.onFlip()
    }
  }

  return (
    <div class="flashcard-container">
      <div
        class="flashcard"
        data-flipped={props.flipped ? "" : undefined}
        onClick={() => !props.flipped && props.onFlip()}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={props.flipped ? "Card showing answer" : "Card showing question, press to reveal"}
      >
        <div class="flashcard__inner">
          <div class="flashcard__face flashcard__front">
            <div class="flashcard__label">Question</div>
            <div class="flashcard__content">{props.card.front}</div>
            <Show when={!props.flipped}>
              <div class="flashcard__hint">
                Click or press Space to reveal
              </div>
            </Show>
          </div>

          <div class="flashcard__face flashcard__back">
            <div class="flashcard__label">Answer</div>
            <div class="flashcard__content">{props.card.back}</div>
            <Show when={props.card.personalNote}>
              <div class="flashcard__note">
                <span class="flashcard__note-label">Note:</span>
                {props.card.personalNote}
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
