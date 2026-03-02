export function ReviewProgress({
  current,
  total,
  correct,
  wrong,
}: {
  current: number;
  total: number;
  correct: number;
  wrong: number;
}) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {current} / {total}
        </span>
        <div className="flex gap-3 text-xs">
          <span className="text-green-600">{correct} correct</span>
          <span className="text-red-500">{wrong} wrong</span>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Review progress: ${current} of ${total} cards`}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
