import { auth } from "@/lib/auth";
import { db } from "@/db";
import { analysisRuns } from "@/db/schema";
import { inArray, desc } from "drizzle-orm";
import { getAccessibleOwners } from "@/lib/github";

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
    .limit(50);

  return Response.json(runs);
}
