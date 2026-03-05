"use client";

import Link from "next/link";
import type { AnalysisRunSummary, RepoTrend } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreDelta } from "@/components/score-delta";
import { RepoSparkline } from "@/components/repo-sparkline";

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

interface AnalysisHistoryProps {
  runs: AnalysisRunSummary[];
  repoTrends: RepoTrend[];
  loading: boolean;
}

export function AnalysisHistory({
  runs,
  repoTrends,
  loading,
}: AnalysisHistoryProps) {
  if (loading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Recent Analyses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (runs.length === 0) return null;

  const trendMap = new Map<string, RepoTrend>();
  for (const trend of repoTrends) {
    trendMap.set(`${trend.owner}/${trend.repo}/${trend.focusPath}`, trend);
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="text-lg">Recent Analyses</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {runs.map((run) => {
            const trend = trendMap.get(
              `${run.owner}/${run.repo}/${run.focusPath}`
            );
            return (
              <Link
                key={run.id}
                href={`/analysis/${run.owner}/${run.repo}${run.focusPath ? `?focusPath=${encodeURIComponent(run.focusPath)}` : ""}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium truncate">
                    {run.owner}/{run.repo}
                  </span>
                  {run.stack && (
                    <span className="text-xs text-muted-foreground truncate">
                      {run.stack}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  {trend && <RepoSparkline dataPoints={trend.dataPoints} />}
                  <ScoreBadge score={run.score} />
                  {trend && <ScoreDelta delta={trend.delta} />}
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {relativeDate(run.createdAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
