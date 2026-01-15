import { Schema as S } from "effect"

// Branded IDs for type safety
export const CardIdSchema = S.String.pipe(S.brand("CardId"))
export type CardId = S.Schema.Type<typeof CardIdSchema>

export const DeckIdSchema = S.String.pipe(S.brand("DeckId"))
export type DeckId = S.Schema.Type<typeof DeckIdSchema>

export const ReviewLogIdSchema = S.String.pipe(S.brand("ReviewLogId"))
export type ReviewLogId = S.Schema.Type<typeof ReviewLogIdSchema>

// Helper to create IDs
export const CardId = {
  make: (s: string): CardId => s as CardId,
  generate: (): CardId => crypto.randomUUID() as CardId,
}

export const DeckId = {
  make: (s: string): DeckId => s as DeckId,
  generate: (): DeckId => crypto.randomUUID() as DeckId,
}

export const ReviewLogId = {
  make: (s: string): ReviewLogId => s as ReviewLogId,
  generate: (): ReviewLogId => crypto.randomUUID() as ReviewLogId,
}
