"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory } from "@/lib/history";
import type { AnalysisRecord } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function relativeDate(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const days = Math.floor(
    (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <Badge variant="secondary">N/A</Badge>;
  }
  const color =
    score < 4
      ? "bg-red-500/15 text-red-700 dark:text-red-400"
      : score <= 6
        ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
        : "bg-green-500/15 text-green-700 dark:text-green-400";
  return (
    <Badge variant="secondary" className={color}>
      {score}/10
    </Badge>
  );
}

export function AnalysisHistory() {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  if (history.length === 0) return null;

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg">Recent Analyses</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {history.map((record) => (
            <Link
              key={`${record.owner}/${record.repo}`}
              href={`/analysis/${record.owner}/${record.repo}${record.focusPath ? `?focusPath=${encodeURIComponent(record.focusPath)}` : ""}`}
              className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium truncate">
                  {record.owner}/{record.repo}
                </span>
                {record.stack && (
                  <span className="text-xs text-muted-foreground truncate">
                    {record.stack}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <ScoreBadge score={record.score} />
                <span className="text-xs text-muted-foreground w-20 text-right">
                  {relativeDate(record.date)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
