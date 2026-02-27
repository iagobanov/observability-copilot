"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiKeyInput } from "@/components/api-key-input";
import type { RepoSummary } from "@/types";

export function AnalysisConfig({
  repo,
  onBack,
}: {
  repo: RepoSummary;
  onBack: () => void;
}) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [focusPath, setFocusPath] = useState("");
  const [maxFiles, setMaxFiles] = useState(50);

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
  }, []);

  const canRun = apiKey.startsWith("sk-");

  const handleRun = () => {
    const params = new URLSearchParams();
    if (focusPath) params.set("focusPath", focusPath);
    params.set("maxFiles", String(maxFiles));

    router.push(
      `/analysis/${repo.owner}/${repo.name}?${params.toString()}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Back
        </button>
        <h2 className="text-lg font-semibold">{repo.full_name}</h2>
        {repo.private && <Badge variant="outline">Private</Badge>}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysis Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Focus Path</label>
              <Input
                placeholder="e.g. src/api/ (leave empty for entire repo)"
                value={focusPath}
                onChange={(e) => setFocusPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Limit analysis to a specific folder
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Max Files: {maxFiles}
              </label>
              <input
                type="range"
                min={10}
                max={100}
                step={10}
                value={maxFiles}
                onChange={(e) => setMaxFiles(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                More files = deeper analysis but higher API cost
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <ApiKeyInput value={apiKey} onChange={handleApiKeyChange} />
          </CardContent>
        </Card>
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={!canRun}
        onClick={handleRun}
      >
        {canRun ? "Run Observability Analysis" : "Enter your Anthropic API key to continue"}
      </Button>
    </div>
  );
}
