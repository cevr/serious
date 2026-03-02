import { Button } from "~/components/ui/button";

export function FlashCard({
  front,
  back,
  isFlipped,
  onFlip,
  onSpeak,
}: {
  front: string;
  back: string;
  isFlipped: boolean;
  onFlip: () => void;
  onSpeak: () => void;
}) {
  return (
    <div
      className="perspective-[1000px] cursor-pointer"
      onClick={onFlip}
    >
      <div
        className="relative h-64 w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center rounded-xl border border-border bg-card p-8 shadow-sm"
          style={{ backfaceVisibility: "hidden" }}
        >
          <p className="text-center text-2xl font-medium">{front}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 text-xs text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onSpeak();
            }}
          >
            Listen
          </Button>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-card p-8 shadow-sm"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <p className="text-center text-2xl font-medium">{back}</p>
        </div>
      </div>
    </div>
  );
}
