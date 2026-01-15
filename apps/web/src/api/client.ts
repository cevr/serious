/**
 * API client for communicating with the Serious SRS server.
 * Uses fetch with proper error handling and type safety.
 */

import type { Card, Deck, DeckStats, ReviewLog, DailyProgress } from "@serious/shared"
import type { AggregateStats, PaginatedCards, RetentionDataPoint, ReviewResult } from "@serious/api"

const API_BASE = "/api"

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      response.status,
      body?.message ?? `Request failed: ${response.statusText}`,
      body
    )
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Deck API
export const decks = {
  list: () => request<Deck[]>("/decks"),

  get: (deckId: string) => request<Deck>(`/decks/${deckId}`),

  getStats: (deckId: string) => request<DeckStats>(`/decks/${deckId}/stats`),

  create: (data: {
    name: string
    description?: string
    targetLanguage: string
    nativeLanguage: string
    newCardsPerDay?: number
    reviewsPerDay?: number
    stage?: "pronunciation" | "vocabulary" | "grammar"
  }) => request<Deck>("/decks", { method: "POST", body: JSON.stringify(data) }),

  update: (
    deckId: string,
    data: {
      name?: string
      description?: string | null
      newCardsPerDay?: number
      reviewsPerDay?: number
    }
  ) => request<Deck>(`/decks/${deckId}`, { method: "PATCH", body: JSON.stringify(data) }),

  delete: (deckId: string) => request<void>(`/decks/${deckId}`, { method: "DELETE" }),
}

// Card API
export const cards = {
  listByDeck: (
    deckId: string,
    params?: {
      state?: "new" | "learning" | "review" | "relearning"
      search?: string
      tags?: string
      page?: number
      pageSize?: number
    }
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.state) searchParams.set("state", params.state)
    if (params?.search) searchParams.set("search", params.search)
    if (params?.tags) searchParams.set("tags", params.tags)
    if (params?.page) searchParams.set("page", params.page.toString())
    if (params?.pageSize) searchParams.set("pageSize", params.pageSize.toString())
    const query = searchParams.toString()
    return request<PaginatedCards>(`/decks/${deckId}/cards${query ? `?${query}` : ""}`)
  },

  get: (cardId: string) => request<Card>(`/cards/${cardId}`),

  create: (
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
  ) => request<Card>(`/decks/${deckId}/cards`, { method: "POST", body: JSON.stringify(data) }),

  update: (
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
  ) => request<Card>(`/cards/${cardId}`, { method: "PATCH", body: JSON.stringify(data) }),

  delete: (cardId: string) => request<void>(`/cards/${cardId}`, { method: "DELETE" }),
}

// Review API
export const reviews = {
  getDue: (deckId: string, limit?: number) => {
    const params = limit ? `?limit=${limit}` : ""
    return request<Card[]>(`/decks/${deckId}/due${params}`)
  },

  submit: (cardId: string, rating: 1 | 2 | 3 | 4) =>
    request<ReviewResult>(`/cards/${cardId}/review`, {
      method: "POST",
      body: JSON.stringify({ rating }),
    }),

  getHistory: (cardId: string) => request<ReviewLog[]>(`/cards/${cardId}/history`),
}

// Stats API
export const stats = {
  getAggregate: () => request<AggregateStats>("/stats"),

  getDaily: (from?: string, to?: string) => {
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    const query = params.toString()
    return request<DailyProgress[]>(`/stats/daily${query ? `?${query}` : ""}`)
  },

  getRetention: (days?: number) => {
    const params = days ? `?days=${days}` : ""
    return request<RetentionDataPoint[]>(`/stats/retention${params}`)
  },
}

export { ApiError }
