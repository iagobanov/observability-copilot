import { db } from "@/db";
import { analysisRuns } from "@/db/schema";
import { parseScore } from "@/lib/history";

export async function POST(req: Request) {
  const apiKey = process.env.RESULTS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Results API not configured" },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${apiKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    owner?: string;
    repo?: string;
    full_markdown?: string;
    stack?: string;
    focus_path?: string;
    files_analyzed?: number;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { owner, repo, full_markdown } = body;

  if (!owner || !repo || !full_markdown) {
    return Response.json(
      { error: "Missing required fields: owner, repo, full_markdown" },
      { status: 400 }
    );
  }

  const [row] = await db
    .insert(analysisRuns)
    .values({
      githubUserId: null,
      owner,
      repo,
      score: parseScore(full_markdown),
      stack: body.stack ?? "",
      focusPath: body.focus_path ?? "",
      fullMarkdown: full_markdown,
      source: "action",
      filesAnalyzed: body.files_analyzed ?? null,
    })
    .returning({ id: analysisRuns.id });

  return Response.json({ id: row.id }, { status: 201 });
}
