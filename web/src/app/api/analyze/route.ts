import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { getRepoTree, getFileContents } from "@/lib/github";
import { filterAndPrioritize } from "@/lib/analyzer/file-filter";
import { detectStack } from "@/lib/analyzer/stack-detector";
import { buildUserMessage } from "@/lib/analyzer/message-builder";
import { SYSTEM_PROMPT } from "@/lib/analyzer/system-prompt";
import { db } from "@/db";
import { analysisRuns } from "@/db/schema";
import { parseScore } from "@/lib/history";

export const maxDuration = 120;

function sseEncode(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    owner?: string;
    repo?: string;
    anthropicApiKey?: string;
    focusPath?: string;
    maxFiles?: number;
  };

  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { owner, repo, anthropicApiKey, focusPath = "", maxFiles = 50 } = body;

  if (!owner || !repo || !anthropicApiKey) {
    return new Response("Missing required fields", { status: 400 });
  }

  const githubToken = session.accessToken;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEncode(data)));
      };

      try {
        // Step 1: Fetch repo tree
        send({
          type: "progress",
          stage: "tree",
          detail: `Fetching file tree for ${owner}/${repo}...`,
        });

        const allPaths = await getRepoTree(githubToken, owner, repo);
        send({
          type: "progress",
          stage: "tree",
          detail: `Found ${allPaths.length} files in repository`,
        });

        // Step 2: Filter and prioritize
        send({
          type: "progress",
          stage: "filter",
          detail: "Filtering and prioritizing files...",
        });

        const selectedPaths = filterAndPrioritize(allPaths, focusPath, maxFiles);
        send({
          type: "progress",
          stage: "filter",
          detail: `Selected ${selectedPaths.length} files for analysis`,
        });

        // Step 3: Fetch file contents
        send({
          type: "progress",
          stage: "fetch",
          detail: `Fetching contents of ${selectedPaths.length} files...`,
        });

        const fileContents = await getFileContents(
          githubToken,
          owner,
          repo,
          selectedPaths
        );
        send({
          type: "progress",
          stage: "fetch",
          detail: `Loaded ${fileContents.size} files`,
        });

        if (fileContents.size === 0) {
          send({
            type: "error",
            message: "No analyzable files found in repository",
          });
          controller.close();
          return;
        }

        // Step 4: Detect stack
        send({
          type: "progress",
          stage: "detect",
          detail: "Detecting language and framework...",
        });

        const stack = detectStack(fileContents);
        send({
          type: "progress",
          stage: "detect",
          detail: `Detected: ${stack}`,
        });

        // Step 5: Run analysis with Claude
        send({
          type: "progress",
          stage: "analyze",
          detail: "Starting observability analysis with Claude...",
        });
        send({ type: "analysis_start" });

        const userMessage = buildUserMessage(
          `${owner}/${repo}`,
          stack,
          fileContents
        );

        const client = new Anthropic({ apiKey: anthropicApiKey });

        const response = client.messages.stream({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        });

        let fullText = "";

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            send({ type: "analysis_delta", text: event.delta.text });
          }
        }

        send({ type: "analysis_done", fullText });

        // Persist to DB (best-effort — don't break the user's analysis)
        try {
          await db.insert(analysisRuns).values({
            githubUserId: session.user?.id ?? null,
            owner,
            repo,
            score: parseScore(fullText),
            stack,
            focusPath,
            fullMarkdown: fullText,
            source: "web",
            filesAnalyzed: fileContents.size,
          });
        } catch (dbErr) {
          console.error("Failed to persist analysis run:", dbErr);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Analysis failed";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
