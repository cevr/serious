import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function SessionSummary({
  reviewed,
  correct,
  wrong,
  timeSpentSeconds,
  deckId,
  deckName,
}: {
  reviewed: number;
  correct: number;
  wrong: number;
  timeSpentSeconds: number;
  deckId: string;
  deckName: string;
}) {
  const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;
  const minutes = Math.floor(timeSpentSeconds / 60);
  const seconds = timeSpentSeconds % 60;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">Session Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-center text-sm text-muted-foreground">
            {deckName}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold">{reviewed}</p>
              <p className="text-xs text-muted-foreground">Reviewed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{accuracy}%</p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{correct}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{wrong}</p>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Time: {minutes}m {seconds}s
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <Button render={<Link to={`/decks/${deckId}`} />} variant="secondary">
              Back to Deck
            </Button>
            <Button render={<Link to="/" />}>
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
