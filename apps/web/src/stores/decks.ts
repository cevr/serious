/**
 * Deck store - manages deck list and individual deck state.
 */

import { createSignal, createResource, type Resource } from "solid-js"
import type { Deck, DeckStats } from "@serious/shared"
import { decks as deckApi } from "@/api/client"

// All decks list
const [decksResource, { refetch: refetchDecks }] = createResource(
  () => true,
  async () => {
    const result = await deckApi.list()
    return result
  },
  { initialValue: [] }
)

// Currently selected deck
const [selectedDeckId, setSelectedDeckId] = createSignal<string | null>(null)

// Deck stats cache
const statsCache = new Map<string, { data: DeckStats; timestamp: number }>()
const STATS_CACHE_TTL = 30_000 // 30 seconds

async function getDeckStats(deckId: string, force = false): Promise<DeckStats> {
  const cached = statsCache.get(deckId)
  const now = Date.now()

  if (!force && cached && now - cached.timestamp < STATS_CACHE_TTL) {
    return cached.data
  }

  const stats = await deckApi.getStats(deckId)
  statsCache.set(deckId, { data: stats, timestamp: now })
  return stats
}

async function createDeck(data: {
  name: string
  description?: string
  targetLanguage: string
  nativeLanguage: string
  newCardsPerDay?: number
  reviewsPerDay?: number
  stage?: "pronunciation" | "vocabulary" | "grammar"
}): Promise<Deck> {
  const deck = await deckApi.create(data)
  await refetchDecks()
  return deck
}

async function updateDeck(
  deckId: string,
  data: {
    name?: string
    description?: string | null
    newCardsPerDay?: number
    reviewsPerDay?: number
  }
): Promise<Deck> {
  const deck = await deckApi.update(deckId, data)
  await refetchDecks()
  return deck
}

async function deleteDeck(deckId: string): Promise<void> {
  await deckApi.delete(deckId)
  statsCache.delete(deckId)
  if (selectedDeckId() === deckId) {
    setSelectedDeckId(null)
  }
  await refetchDecks()
}

export const deckStore = {
  // Reactive getters
  get decks(): Resource<Deck[]> {
    return decksResource
  },
  get selectedDeckId() {
    return selectedDeckId
  },
  get selectedDeck() {
    const id = selectedDeckId()
    if (!id) return null
    return decksResource()?.find((d) => d.id === id) ?? null
  },

  // Actions
  selectDeck: setSelectedDeckId,
  refetch: refetchDecks,
  getStats: getDeckStats,
  create: createDeck,
  update: updateDeck,
  delete: deleteDeck,
}
