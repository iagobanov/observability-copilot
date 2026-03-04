import { auth } from "@/lib/auth";
import { db } from "@/db";
import { analysisRuns } from "@/db/schema";
import { inArray, desc } from "drizzle-orm";
import { getAccessibleOwners } from "@/lib/github";
import type {
  AnalysisRunSummary,
  RepoTrend,
  OrgOverview,
  DashboardData,
} from "@/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.login || !session.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owners = await getAccessibleOwners(
    session.accessToken,
    session.user.login
  );

  const runs = await db
    .select({
      id: analysisRuns.id,
      owner: analysisRuns.owner,
      repo: analysisRuns.repo,
      score: analysisRuns.score,
      stack: analysisRuns.stack,
      focusPath: analysisRuns.focusPath,
      source: analysisRuns.source,
      filesAnalyzed: analysisRuns.filesAnalyzed,
      createdAt: analysisRuns.createdAt,
    })
    .from(analysisRuns)
    .where(inArray(analysisRuns.owner, owners))
    .orderBy(desc(analysisRuns.createdAt))
    .limit(500);

  // Group runs by owner/repo/focusPath
  const groups = new Map<string, typeof runs>();
  for (const run of runs) {
    const key = `${run.owner}/${run.repo}/${run.focusPath}`;
    const group = groups.get(key);
    if (group) {
      group.push(run);
    } else {
      groups.set(key, [run]);
    }
  }

  // Build RepoTrend for each group
  const repoTrends: RepoTrend[] = [];
  for (const [, group] of groups) {
    const first = group[0]; // most recent (desc order)
    // Reverse to oldest-first for charting, take last 20
    const chronological = [...group].reverse().slice(-20);
    const dataPoints = chronological
      .filter((r) => r.score !== null)
      .map((r) => ({
        date: new Date(r.createdAt).toISOString(),
        score: r.score!,
      }));

    const latestScore = first.score;
    const previousRun = group.length > 1 ? group[1] : null;
    const previousScore = previousRun?.score ?? null;
    const delta =
      latestScore !== null && previousScore !== null
        ? latestScore - previousScore
        : null;

    repoTrends.push({
      owner: first.owner,
      repo: first.repo,
      focusPath: first.focusPath,
      latestScore,
      previousScore,
      delta,
      runCount: group.length,
      dataPoints,
    });
  }

  // Build OrgOverview for each unique owner
  const ownerGroups = new Map<string, RepoTrend[]>();
  for (const trend of repoTrends) {
    const existing = ownerGroups.get(trend.owner);
    if (existing) {
      existing.push(trend);
    } else {
      ownerGroups.set(trend.owner, [trend]);
    }
  }

  const orgs: OrgOverview[] = [];
  for (const [owner, trends] of ownerGroups) {
    const latestScores = trends
      .map((t) => t.latestScore)
      .filter((s): s is number => s !== null);
    const previousScores = trends
      .map((t) => t.previousScore)
      .filter((s): s is number => s !== null);
    const totalRuns = trends.reduce((sum, t) => sum + t.runCount, 0);

    const averageScore =
      latestScores.length > 0
        ? Math.round(
            (latestScores.reduce((a, b) => a + b, 0) / latestScores.length) *
              10
          ) / 10
        : 0;

    const previousAverageScore =
      previousScores.length > 0
        ? Math.round(
            (previousScores.reduce((a, b) => a + b, 0) /
              previousScores.length) *
              10
          ) / 10
        : null;

    const delta =
      previousAverageScore !== null
        ? Math.round((averageScore - previousAverageScore) * 10) / 10
        : null;

    orgs.push({
      owner,
      averageScore,
      repoCount: trends.length,
      totalRuns,
      previousAverageScore,
      delta,
    });
  }

  // Recent runs (top 50, already desc order)
  const recentRuns: AnalysisRunSummary[] = runs.slice(0, 50).map((r) => ({
    id: r.id,
    owner: r.owner,
    repo: r.repo,
    score: r.score,
    stack: r.stack,
    focusPath: r.focusPath,
    source: r.source,
    filesAnalyzed: r.filesAnalyzed,
    createdAt: new Date(r.createdAt).toISOString(),
  }));

  const data: DashboardData = { orgs, repoTrends, recentRuns };
  return Response.json(data);
}
