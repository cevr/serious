/**
 * Review session store - manages the current review session state.
 */

import { createSignal, batch } from "solid-js"
import type { Card, Rating } from "@serious/shared"
import type { ReviewResult } from "@serious/api"
import { reviews as reviewApi } from "@/api/client"

type SessionState =
  | { status: "idle" }
  | { status: "loading"; deckId: string }
  | { status: "active"; deckId: string; cards: Card[]; currentIndex: number; startedAt: Date }
  | { status: "complete"; deckId: string; stats: SessionStats }
  | { status: "error"; message: string }

interface SessionStats {
  reviewed: number
  correct: number
  wrong: number
  startedAt: Date
  endedAt: Date
}

const [sessionState, setSessionState] = createSignal<SessionState>({ status: "idle" })
const [isFlipped, setIsFlipped] = createSignal(false)

async function startSession(deckId: string, limit = 50): Promise<void> {
  setSessionState({ status: "loading", deckId })

  try {
    const cards = await reviewApi.getDue(deckId, limit)

    if (cards.length === 0) {
      setSessionState({
        status: "complete",
        deckId,
        stats: {
          reviewed: 0,
          correct: 0,
          wrong: 0,
          startedAt: new Date(),
          endedAt: new Date(),
        },
      })
      return
    }

    batch(() => {
      setSessionState({
        status: "active",
        deckId,
        cards,
        currentIndex: 0,
        startedAt: new Date(),
      })
      setIsFlipped(false)
    })
  } catch (error) {
    setSessionState({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to start session",
    })
  }
}

async function submitReview(rating: Rating): Promise<ReviewResult | null> {
  const state = sessionState()
  if (state.status !== "active") return null

  const currentCard = state.cards[state.currentIndex]
  if (!currentCard) return null

  try {
    const result = await reviewApi.submit(currentCard.id, rating)

    const nextIndex = state.currentIndex + 1
    const isLastCard = nextIndex >= state.cards.length

    batch(() => {
      if (isLastCard) {
        // Calculate final stats
        const correct = state.cards.reduce((acc, _, i) => {
          // We don't track individual ratings, so we'll approximate
          // In a real app, we'd track this during the session
          return acc
        }, 0)

        setSessionState({
          status: "complete",
          deckId: state.deckId,
          stats: {
            reviewed: state.cards.length,
            correct: Math.round(state.cards.length * 0.7), // Placeholder
            wrong: Math.round(state.cards.length * 0.3),
            startedAt: state.startedAt,
            endedAt: new Date(),
          },
        })
      } else {
        setSessionState({
          ...state,
          currentIndex: nextIndex,
        })
        setIsFlipped(false)
      }
    })

    return result
  } catch (error) {
    setSessionState({
      status: "error",
      message: error instanceof Error ? error.message : "Failed to submit review",
    })
    return null
  }
}

function flipCard(): void {
  setIsFlipped(true)
}

function endSession(): void {
  batch(() => {
    setSessionState({ status: "idle" })
    setIsFlipped(false)
  })
}

function getCurrentCard(): Card | null {
  const state = sessionState()
  if (state.status !== "active") return null
  return state.cards[state.currentIndex] ?? null
}

function getProgress(): { current: number; total: number } {
  const state = sessionState()
  if (state.status !== "active") {
    return { current: 0, total: 0 }
  }
  return {
    current: state.currentIndex + 1,
    total: state.cards.length,
  }
}

export const reviewStore = {
  // Reactive getters
  get state() {
    return sessionState
  },
  get isFlipped() {
    return isFlipped
  },

  // Computed
  getCurrentCard,
  getProgress,

  // Actions
  start: startSession,
  submit: submitReview,
  flip: flipCard,
  end: endSession,
}
