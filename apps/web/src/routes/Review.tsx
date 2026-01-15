import { useParams } from "@solidjs/router"
import { ReviewSession } from "@/components/review"

export function Review() {
  const params = useParams<{ deckId: string }>()

  return <ReviewSession deckId={params.deckId} />
}
