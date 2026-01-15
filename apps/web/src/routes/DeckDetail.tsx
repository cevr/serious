import { createResource, createSignal, For, Show, Suspense, createEffect, onCleanup } from "solid-js"
import { A, useParams, useNavigate } from "@solidjs/router"
import { Button, Badge, Progress, Skeleton, SkeletonText } from "@/components/ui"
import { showToast } from "@/components/ui"
import { CardItem, CardEditor } from "@/components/card"
import { deckStore, cardStore } from "@/stores"
import type { Card, Deck, DeckStats } from "@serious/shared"
import { decks as deckApi } from "@/api/client"
import "./DeckDetail.css"

export function DeckDetail() {
  const params = useParams<{ deckId: string }>()
  const navigate = useNavigate()

  const [deck] = createResource(() => params.deckId, deckApi.get)
  const [stats] = createResource(() => params.deckId, (id) => deckStore.getStats(id, true))

  const [showCardEditor, setShowCardEditor] = createSignal(false)
  const [editingCard, setEditingCard] = createSignal<Card | null>(null)

  // Load cards when deck changes
  createEffect(() => {
    cardStore.load(params.deckId, { pageSize: 50 })
  })

  onCleanup(() => {
    cardStore.clear()
  })

  function openCardEditor(card?: Card) {
    setEditingCard(card ?? null)
    setShowCardEditor(true)
  }

  function closeCardEditor() {
    setShowCardEditor(false)
    setEditingCard(null)
  }

  async function handleDeleteDeck() {
    const d = deck()
    if (!d) return

    if (!confirm(`Are you sure you want to delete "${d.name}"? This will delete all cards and cannot be undone.`)) {
      return
    }

    try {
      await deckStore.delete(d.id)
      showToast("success", `Deck "${d.name}" deleted`)
      navigate("/")
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to delete deck")
    }
  }

  const stageLabels = {
    pronunciation: "Pronunciation",
    vocabulary: "Vocabulary",
    grammar: "Grammar",
  }

  return (
    <div class="deck-detail">
      <Suspense
        fallback={
          <div class="deck-detail__loading">
            <Skeleton width="200px" height="2rem" />
            <SkeletonText lines={2} />
          </div>
        }
      >
        <Show when={deck()}>
          {(d) => (
            <>
              <header class="deck-detail__header">
                <A href="/" class="deck-detail__back">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Back to Decks
                </A>

                <div class="deck-detail__title-row">
                  <div class="deck-detail__title-group">
                    <h1 class="deck-detail__title">{d().name}</h1>
                    <div class="deck-detail__meta">
                      <Badge>{stageLabels[d().stage]}</Badge>
                      <span class="deck-detail__languages">
                        {d().targetLanguage.toUpperCase()} → {d().nativeLanguage.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <Button variant="danger" size="sm" onClick={handleDeleteDeck}>
                    Delete Deck
                  </Button>
                </div>

                <Show when={d().description}>
                  <p class="deck-detail__description">{d().description}</p>
                </Show>
              </header>

              <Show when={stats()}>
                {(s) => (
                  <section class="deck-detail__stats">
                    <div class="deck-detail__stat-grid">
                      <div class="deck-detail__stat">
                        <span class="deck-detail__stat-value tabular-nums">{s().totalCards}</span>
                        <span class="deck-detail__stat-label">Total Cards</span>
                      </div>
                      <div class="deck-detail__stat deck-detail__stat--new">
                        <span class="deck-detail__stat-value tabular-nums">{s().newCount}</span>
                        <span class="deck-detail__stat-label">New</span>
                      </div>
                      <div class="deck-detail__stat deck-detail__stat--learning">
                        <span class="deck-detail__stat-value tabular-nums">{s().learningCount}</span>
                        <span class="deck-detail__stat-label">Learning</span>
                      </div>
                      <div class="deck-detail__stat deck-detail__stat--review">
                        <span class="deck-detail__stat-value tabular-nums">{s().reviewCount}</span>
                        <span class="deck-detail__stat-label">Review</span>
                      </div>
                    </div>

                    <Show when={s().dueToday > 0}>
                      <div class="deck-detail__due-banner">
                        <div class="deck-detail__due-info">
                          <span class="deck-detail__due-count tabular-nums">{s().dueToday}</span>
                          <span class="deck-detail__due-text">cards due for review</span>
                        </div>
                        <A href={`/decks/${params.deckId}/review`}>
                          <Button>Start Review</Button>
                        </A>
                      </div>
                    </Show>

                    <Show when={s().dueToday === 0 && s().totalCards > 0}>
                      <div class="deck-detail__all-done">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>All caught up! No reviews due.</span>
                      </div>
                    </Show>
                  </section>
                )}
              </Show>

              <section class="deck-detail__cards">
                <div class="deck-detail__cards-header">
                  <h2>Cards</h2>
                  <Button onClick={() => openCardEditor()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style={{ width: "1.25em", height: "1.25em" }}>
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Card
                  </Button>
                </div>

                <Show
                  when={cardStore.cards.length > 0}
                  fallback={
                    <div class="deck-detail__cards-empty">
                      <p>No cards yet. Add your first card to start learning.</p>
                      <Button onClick={() => openCardEditor()}>Add Your First Card</Button>
                    </div>
                  }
                >
                  <div class="deck-detail__card-list">
                    <For each={cardStore.cards}>
                      {(card) => <CardItem card={card} onClick={() => openCardEditor(card)} />}
                    </For>
                  </div>
                </Show>
              </section>

              <CardEditor
                open={showCardEditor()}
                onClose={closeCardEditor}
                deckId={params.deckId}
                card={editingCard()}
              />
            </>
          )}
        </Show>
      </Suspense>
    </div>
  )
}
