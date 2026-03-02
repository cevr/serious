import type { Rating } from "@serious/shared";
import { Button } from "~/components/ui/button";

const ratings: Array<{ value: Rating; label: string; key: string; variant: "destructive" | "secondary" | "default" | "outline" }> = [
  { value: 1, label: "Again", key: "1", variant: "destructive" },
  { value: 2, label: "Hard", key: "2", variant: "secondary" },
  { value: 3, label: "Good", key: "3", variant: "default" },
  { value: 4, label: "Easy", key: "4", variant: "outline" },
];

export function RatingButtons({ onRate }: { onRate: (rating: Rating) => void }) {
  return (
    <div className="flex justify-center gap-3">
      {ratings.map(({ value, label, key, variant }) => (
        <Button
          key={value}
          variant={variant}
          size="sm"
          onClick={() => onRate(value)}
          className="min-w-[4.5rem]"
        >
          {label}
          <kbd className="ml-1.5 text-[10px] opacity-50">{key}</kbd>
        </Button>
      ))}
    </div>
  );
}
