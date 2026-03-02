import { Link } from "react-router";
import type { Deck, DeckStats } from "@serious/shared";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function DeckCard({
  deck,
  stats,
}: {
  deck: Deck;
  stats?: DeckStats;
}) {
  return (
    <Link to={`/decks/${deck.id}`} className="block">
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{deck.name}</CardTitle>
            {stats && stats.dueToday > 0 && (
              <Badge>{stats.dueToday} due</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>
              {deck.targetLanguage} → {deck.nativeLanguage}
            </span>
            <span>·</span>
            <span>{stats?.totalCards ?? 0} cards</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
