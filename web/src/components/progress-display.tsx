"use client";

import type { AnalysisStatus } from "@/types";

const STEPS = [
  { key: "fetching_tree", label: "Fetching file tree" },
  { key: "fetching_files", label: "Loading file contents" },
  { key: "analyzing", label: "Analyzing with Claude" },
  { key: "done", label: "Analysis complete" },
] as const;

function stepIndex(status: AnalysisStatus): number {
  switch (status) {
    case "connecting":
    case "fetching_tree":
      return 0;
    case "fetching_files":
      return 1;
    case "analyzing":
      return 2;
    case "done":
      return 3;
    default:
      return -1;
  }
}

export function ProgressDisplay({
  status,
  progress,
}: {
  status: AnalysisStatus;
  progress: string[];
}) {
  const current = stepIndex(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                    ? "bg-primary text-primary-foreground animate-pulse"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < current ? "\u2713" : i + 1}
            </div>
            <span
              className={`text-sm hidden sm:inline ${
                i <= current
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 ${
                  i < current ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {progress.length > 0 && (
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="max-h-32 overflow-y-auto space-y-0.5 font-mono text-xs text-muted-foreground">
            {progress.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
