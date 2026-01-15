import { For, Show, Suspense, createSignal } from "solid-js"
import { Button, SkeletonCard } from "@/components/ui"
import { DeckCard, CreateDeckModal } from "@/components/deck"
import { deckStore } from "@/stores"
import "./Home.css"

export function Home() {
  const [showCreateModal, setShowCreateModal] = createSignal(false)

  return (
    <div class="home">
      <header class="home__header">
        <div class="home__title-group">
          <h1 class="home__title">Your Decks</h1>
          <p class="home__subtitle">Master new languages through spaced repetition</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: "1.25em", height: "1.25em" }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Deck
        </Button>
      </header>

      <Suspense
        fallback={
          <div class="home__grid">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        }
      >
        <Show
          when={(deckStore.decks()?.length ?? 0) > 0}
          fallback={
            <div class="home__empty">
              <div class="home__empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h2 class="home__empty-title">No decks yet</h2>
              <p class="home__empty-text">
                Create your first deck to start learning with spaced repetition.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>Create Your First Deck</Button>
            </div>
          }
        >
          <div class="home__grid">
            <For each={deckStore.decks()}>{(deck) => <DeckCard deck={deck} />}</For>
          </div>
        </Show>
      </Suspense>

      <CreateDeckModal open={showCreateModal()} onClose={() => setShowCreateModal(false)} />
    </div>
  )
}
