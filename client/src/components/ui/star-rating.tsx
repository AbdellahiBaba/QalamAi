import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  count?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  testIdPrefix?: string;
}

export default function StarRating({ rating, count, interactive = false, onRate, size = "md", showCount = true, testIdPrefix = "" }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const prefix = testIdPrefix ? `${testIdPrefix}-` : "";
  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center gap-1.5" dir="ltr" data-testid={`${prefix}star-rating`}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={cn(
              "transition-colors",
              interactive ? "cursor-pointer" : "cursor-default"
            )}
            onClick={() => interactive && onRate?.(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            data-testid={`${prefix}star-${star}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                star <= displayRating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-none text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      {showCount && typeof count === "number" && count > 0 && (
        <span className="text-xs text-muted-foreground" dir="ltr" data-testid="text-rating-count">
          ({count})
        </span>
      )}
      {rating > 0 && (
        <span className="text-sm font-medium text-amber-600 dark:text-amber-400" dir="ltr" data-testid="text-rating-value">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
