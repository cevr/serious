import { Show, Switch, Match, createEffect, onCleanup } from "solid-js"
import { A } from "@solidjs/router"
import { Button, Progress } from "@/components/ui"
import { Flashcard } from "./Flashcard"
import { RatingButtons } from "./RatingButtons"
import { reviewStore } from "@/stores"
import type { Rating } from "@serious/shared"
import "./ReviewSession.css"

interface ReviewSessionProps {
  deckId: string
  deckName?: string
}

export function ReviewSession(props: ReviewSessionProps) {
  // Start session on mount
  createEffect(() => {
    reviewStore.start(props.deckId)
  })

  // Keyboard shortcuts
  createEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const state = reviewStore.state()

      // Only handle keys when active and not in an input
      if (state.status !== "active") return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const isFlipped = reviewStore.isFlipped()

      // Space to flip
      if (e.key === " " && !isFlipped) {
        e.preventDefault()
        reviewStore.flip()
        return
      }

      // Number keys for rating
      if (isFlipped && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault()
        reviewStore.submit(parseInt(e.key, 10) as Rating)
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown)
    })
  })

  return (
    <div class="review-session">
      <Switch>
        <Match when={reviewStore.state().status === "loading"}>
          <div class="review-session__loading">
            <div class="review-session__spinner" />
            <p>Loading cards…</p>
          </div>
        </Match>

        <Match when={reviewStore.state().status === "error"}>
          <div class="review-session__error">
            <h2>Something went wrong</h2>
            <p>{(reviewStore.state() as { status: "error"; message: string }).message}</p>
            <Button onClick={() => reviewStore.start(props.deckId)}>Try Again</Button>
          </div>
        </Match>

        <Match when={reviewStore.state().status === "active"}>
          <Show when={reviewStore.getCurrentCard()}>
            {(card) => {
              const progress = () => reviewStore.getProgress()

              return (
                <>
                  <header class="review-session__header">
                    <A href={`/decks/${props.deckId}`} class="review-session__back">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                      <span class="sr-only">Back to deck</span>
                    </A>
                    <div class="review-session__progress-wrapper">
                      <span class="review-session__count tabular-nums">
                        {progress().current} / {progress().total}
                      </span>
                      <Progress
                        value={progress().current}
                        max={progress().total}
                        variant="success"
                      />
                    </div>
                  </header>

                  <main class="review-session__main">
                    <Flashcard
                      card={card()}
                      flipped={reviewStore.isFlipped()}
                      onFlip={reviewStore.flip}
                    />
                  </main>

                  <footer class="review-session__footer">
                    <Show
                      when={reviewStore.isFlipped()}
                      fallback={
                        <div class="review-session__flip-hint">
                          <Button size="lg" onClick={reviewStore.flip}>
                            Show Answer
                          </Button>
                          <span class="review-session__shortcut">or press Space</span>
                        </div>
                      }
                    >
                      <div class="review-session__rating">
                        <p class="review-session__rating-prompt">How well did you remember?</p>
                        <RatingButtons onRate={reviewStore.submit} />
                      </div>
                    </Show>
                  </footer>
                </>
              )
            }}
          </Show>
        </Match>

        <Match when={reviewStore.state().status === "complete"}>
          <div class="review-session__complete">
            <div class="review-session__complete-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 class="review-session__complete-title">Session Complete!</h2>
            <Show
              when={(() => {
                const state = reviewStore.state()
                return state.status === "complete" && state.stats.reviewed > 0 ? state.stats : null
              })()}
            >
              {(stats) => (
                <div class="review-session__stats">
                  <div class="review-session__stat">
                    <span class="review-session__stat-value tabular-nums">{stats().reviewed}</span>
                    <span class="review-session__stat-label">Cards Reviewed</span>
                  </div>
                  <div class="review-session__stat">
                    <span class="review-session__stat-value tabular-nums">{stats().correct}</span>
                    <span class="review-session__stat-label">Correct</span>
                  </div>
                  <div class="review-session__stat">
                    <span class="review-session__stat-value tabular-nums">
                      {Math.round((stats().correct / stats().reviewed) * 100)}%
                    </span>
                    <span class="review-session__stat-label">Accuracy</span>
                  </div>
                </div>
              )}
            </Show>
            <Show when={(() => {
              const state = reviewStore.state()
              return state.status === "complete" && state.stats.reviewed === 0
            })()}>
              <p class="review-session__no-cards">No cards due for review. Great job!</p>
            </Show>
            <div class="review-session__complete-actions">
              <A href={`/decks/${props.deckId}`}>
                <Button variant="secondary">Back to Deck</Button>
              </A>
              <A href="/">
                <Button>Home</Button>
              </A>
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  )
}
