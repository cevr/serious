import { createResource, Show, Suspense } from "solid-js"
import { A } from "@solidjs/router"
import { Card, CardBody, Badge, Skeleton } from "@/components/ui"
import { deckStore } from "@/stores"
import type { Deck } from "@serious/shared"
import "./DeckCard.css"

interface DeckCardProps {
  deck: Deck
}

export function DeckCard(props: DeckCardProps) {
  const [stats] = createResource(
    () => props.deck.id,
    (id) => deckStore.getStats(id)
  )

  const stageLabels = {
    pronunciation: "Pronunciation",
    vocabulary: "Vocabulary",
    grammar: "Grammar",
  }

  return (
    <A href={`/decks/${props.deck.id}`} class="deck-card-link">
      <Card interactive class="deck-card">
        <CardBody>
          <div class="deck-card__header">
            <h3 class="deck-card__name">{props.deck.name}</h3>
            <Badge>{stageLabels[props.deck.stage]}</Badge>
          </div>

          <div class="deck-card__languages">
            <span class="deck-card__lang">{props.deck.targetLanguage.toUpperCase()}</span>
            <span class="deck-card__arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </span>
            <span class="deck-card__lang">{props.deck.nativeLanguage.toUpperCase()}</span>
          </div>

          <Show when={props.deck.description}>
            <p class="deck-card__description">{props.deck.description}</p>
          </Show>

          <Suspense
            fallback={
              <div class="deck-card__stats">
                <Skeleton width="60px" height="1rem" />
                <Skeleton width="80px" height="1rem" />
              </div>
            }
          >
            <Show when={stats()}>
              {(s) => (
                <div class="deck-card__stats">
                  <div class="deck-card__stat">
                    <span class="deck-card__stat-value tabular-nums">{s().totalCards}</span>
                    <span class="deck-card__stat-label">cards</span>
                  </div>
                  <div class="deck-card__stat deck-card__stat--due" data-has-due={s().dueToday > 0 ? "" : undefined}>
                    <span class="deck-card__stat-value tabular-nums">{s().dueToday}</span>
                    <span class="deck-card__stat-label">due today</span>
                  </div>
                  <Show when={s().streak > 0}>
                    <div class="deck-card__stat deck-card__stat--streak">
                      <span class="deck-card__stat-value tabular-nums">{s().streak}</span>
                      <span class="deck-card__stat-label">day streak</span>
                    </div>
                  </Show>
                </div>
              )}
            </Show>
          </Suspense>
        </CardBody>
      </Card>
    </A>
  )
}
