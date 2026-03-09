import { auth } from "@/lib/auth";
import { db } from "@/db";
import { analysisRuns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAccessibleOwners } from "@/lib/github";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.login || !session.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [run] = await db
    .select({
      id: analysisRuns.id,
      owner: analysisRuns.owner,
      repo: analysisRuns.repo,
      score: analysisRuns.score,
      stack: analysisRuns.stack,
      focusPath: analysisRuns.focusPath,
      fullMarkdown: analysisRuns.fullMarkdown,
      createdAt: analysisRuns.createdAt,
    })
    .from(analysisRuns)
    .where(eq(analysisRuns.id, id))
    .limit(1);

  if (!run) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const owners = await getAccessibleOwners(
    session.accessToken,
    session.user.login
  );

  if (!owners.includes(run.owner)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json(run);
}
