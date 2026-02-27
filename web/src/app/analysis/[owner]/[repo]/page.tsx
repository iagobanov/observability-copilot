"use client";

import { Suspense, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAnalysisStream } from "@/hooks/use-analysis-stream";
import { parseScore, saveAnalysis } from "@/lib/history";
import { ProgressDisplay } from "@/components/progress-display";
import { MarkdownReport } from "@/components/markdown-report";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const API_KEY_STORAGE = "observability-copilot-api-key";

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <AnalysisPageInner />
    </Suspense>
  );
}

function AnalysisPageInner() {
  const params = useParams<{ owner: string; repo: string }>();
  const searchParams = useSearchParams();
  const { state, startAnalysis, reset } = useAnalysisStream();
  const started = useRef(false);
  const saved = useRef(false);

  const owner = params.owner;
  const repo = params.repo;
  const focusPath = searchParams.get("focusPath") ?? "";
  const maxFiles = parseInt(searchParams.get("maxFiles") ?? "50", 10);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const apiKey = sessionStorage.getItem(API_KEY_STORAGE);
    if (!apiKey) {
      return;
    }

    startAnalysis({
      owner,
      repo,
      anthropicApiKey: apiKey,
      focusPath,
      maxFiles,
    });
  }, [owner, repo, focusPath, maxFiles, startAnalysis]);

  useEffect(() => {
    if (state.status === "done" && !saved.current) {
      saved.current = true;
      saveAnalysis({
        owner,
        repo,
        score: parseScore(state.analysisText),
        stack: state.detectedStack,
        date: new Date().toISOString(),
        focusPath,
      });
    }
    if (state.status === "connecting") {
      saved.current = false;
    }
  }, [state.status, state.analysisText, state.detectedStack, owner, repo, focusPath]);

  const apiKeyMissing =
    state.status === "idle" &&
    typeof window !== "undefined" &&
    !sessionStorage.getItem(API_KEY_STORAGE);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {owner}/{repo}
          </h1>
          {focusPath && (
            <p className="text-sm text-muted-foreground">
              Focused on: {focusPath}
            </p>
          )}
        </div>
        {state.status === "done" && (
          <Button
            variant="outline"
            onClick={() => {
              started.current = false;
              reset();
              const apiKey = sessionStorage.getItem(API_KEY_STORAGE);
              if (apiKey) {
                started.current = true;
                startAnalysis({
                  owner,
                  repo,
                  anthropicApiKey: apiKey,
                  focusPath,
                  maxFiles,
                });
              }
            }}
          >
            Re-run Analysis
          </Button>
        )}
      </div>

      {apiKeyMissing && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              No API key found. Please go back to the{" "}
              <a href="/dashboard" className="underline">
                dashboard
              </a>{" "}
              and enter your Anthropic API key.
            </p>
          </CardContent>
        </Card>
      )}

      {state.status === "error" && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{state.error}</p>
          </CardContent>
        </Card>
      )}

      {state.status !== "idle" && state.status !== "error" && (
        <ProgressDisplay status={state.status} progress={state.progress} />
      )}

      {state.analysisText && (
        <MarkdownReport content={state.analysisText} />
      )}
    </div>
  );
}
