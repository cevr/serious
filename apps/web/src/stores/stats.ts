/**
 * Stats store - manages aggregate and daily statistics.
 */

import { createResource } from "solid-js"
import type { DailyProgress } from "@serious/shared"
import type { AggregateStats, RetentionDataPoint } from "@serious/api"
import { stats as statsApi } from "@/api/client"

// Aggregate stats
const [aggregateStats, { refetch: refetchAggregate }] = createResource(
  () => true,
  async (): Promise<AggregateStats> => {
    return statsApi.getAggregate()
  },
  {
    initialValue: {
      totalCards: 0,
      totalDue: 0,
      totalNew: 0,
      deckCount: 0,
      overallRetention: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
  }
)

// Daily progress for the last 30 days
const [dailyProgress, { refetch: refetchDaily }] = createResource(
  () => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 30)
    return {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    }
  },
  async ({ from, to }): Promise<DailyProgress[]> => {
    return statsApi.getDaily(from, to)
  },
  { initialValue: [] }
)

// Retention data for charts
const [retentionData, { refetch: refetchRetention }] = createResource(
  () => 30,
  async (days): Promise<RetentionDataPoint[]> => {
    return statsApi.getRetention(days)
  },
  { initialValue: [] }
)

function refetchAll() {
  refetchAggregate()
  refetchDaily()
  refetchRetention()
}

export const statsStore = {
  // Reactive getters
  get aggregate() {
    return aggregateStats
  },
  get daily() {
    return dailyProgress
  },
  get retention() {
    return retentionData
  },

  // Actions
  refetchAggregate,
  refetchDaily,
  refetchRetention,
  refetchAll,
}
