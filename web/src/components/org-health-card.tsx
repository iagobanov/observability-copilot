"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScoreDelta } from "@/components/score-delta";
import { BarChart, Bar, ResponsiveContainer } from "recharts";
import type { OrgOverview, RepoTrend } from "@/types";

interface OrgHealthCardProps {
  org: OrgOverview;
  trends: RepoTrend[];
}

export function OrgHealthCard({ org, trends }: OrgHealthCardProps) {
  const barData = trends
    .filter((t) => t.latestScore !== null)
    .map((t) => ({ name: `${t.repo}`, score: t.latestScore }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{org.owner}</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{org.averageScore}/10</span>
            <ScoreDelta delta={org.delta} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>
            {org.repoCount} {org.repoCount === 1 ? "repo" : "repos"} &middot;{" "}
            {org.totalRuns} {org.totalRuns === 1 ? "run" : "runs"}
          </span>
          <span>avg score across repos</span>
        </div>
        {barData.length > 1 && (
          <div className="h-[40px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <Bar
                  dataKey="score"
                  fill="var(--color-chart-1)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
