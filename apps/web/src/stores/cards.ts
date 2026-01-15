/**
 * Card store - manages cards for a deck with pagination.
 */

import { createSignal, createResource, type Accessor } from "solid-js"
import type { Card, CardState } from "@serious/shared"
import type { PaginatedCards } from "@serious/api"
import { cards as cardApi } from "@/api/client"

interface CardFilters {
  deckId: string
  state?: CardState
  search?: string
  tags?: string
  page?: number
  pageSize?: number
}

const [filters, setFilters] = createSignal<CardFilters | null>(null)

const [cardsResource, { refetch: refetchCards }] = createResource(
  filters,
  async (f): Promise<PaginatedCards> => {
    if (!f) {
      return { cards: [], total: 0, page: 1, pageSize: 20, hasMore: false }
    }
    return cardApi.listByDeck(f.deckId, {
      state: f.state,
      search: f.search,
      tags: f.tags,
      page: f.page,
      pageSize: f.pageSize,
    })
  },
  { initialValue: { cards: [], total: 0, page: 1, pageSize: 20, hasMore: false } }
)

function loadCards(deckId: string, options?: Omit<CardFilters, "deckId">) {
  setFilters({ deckId, ...options })
}

function clearCards() {
  setFilters(null)
}

function updateFilters(updates: Partial<CardFilters>) {
  const current = filters()
  if (current) {
    setFilters({ ...current, ...updates })
  }
}

async function createCard(
  deckId: string,
  data: {
    type?: "basic" | "minimal-pair" | "cloze" | "image-word" | "ipa" | "spelling"
    front: string
    back: string
    audioFront?: string
    audioBack?: string
    image?: string
    personalNote?: string
    tags?: string[]
  }
): Promise<Card> {
  const card = await cardApi.create(deckId, data)
  await refetchCards()
  return card
}

async function updateCard(
  cardId: string,
  data: {
    front?: string
    back?: string
    audioFront?: string | null
    audioBack?: string | null
    image?: string | null
    personalNote?: string | null
    tags?: string[]
  }
): Promise<Card> {
  const card = await cardApi.update(cardId, data)
  await refetchCards()
  return card
}

async function deleteCard(cardId: string): Promise<void> {
  await cardApi.delete(cardId)
  await refetchCards()
}

export const cardStore = {
  // Reactive getters
  get data() {
    return cardsResource
  },
  get cards() {
    return cardsResource()?.cards ?? []
  },
  get total() {
    return cardsResource()?.total ?? 0
  },
  get page() {
    return cardsResource()?.page ?? 1
  },
  get hasMore() {
    return cardsResource()?.hasMore ?? false
  },
  get filters(): Accessor<CardFilters | null> {
    return filters
  },

  // Actions
  load: loadCards,
  clear: clearCards,
  updateFilters,
  refetch: refetchCards,
  create: createCard,
  update: updateCard,
  delete: deleteCard,
  getById: cardApi.get,
}
