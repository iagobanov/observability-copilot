"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ScoreDelta({ delta }: { delta: number | null }) {
  if (delta === null) return null;

  if (delta > 0) {
    return (
      <Badge
        variant="secondary"
        className="bg-green-500/15 text-green-700 dark:text-green-400"
      >
        <TrendingUp className="size-3" />
        +{delta}
      </Badge>
    );
  }

  if (delta < 0) {
    return (
      <Badge
        variant="secondary"
        className="bg-red-500/15 text-red-700 dark:text-red-400"
      >
        <TrendingDown className="size-3" />
        {delta}
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="bg-muted text-muted-foreground"
    >
      <Minus className="size-3" />
      0
    </Badge>
  );
}
