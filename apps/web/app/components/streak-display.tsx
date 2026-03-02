export function StreakDisplay({ streak }: { streak: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className="text-3xl" aria-hidden>
        {streak > 0 ? "\uD83D\uDD25" : "\u2744\uFE0F"}
      </span>
      <div>
        <p className="text-2xl font-bold">{streak}</p>
        <p className="text-xs text-muted-foreground">
          {streak === 1 ? "day streak" : "day streak"}
        </p>
      </div>
    </div>
  );
}
