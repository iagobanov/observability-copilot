"use client";

import { useState } from "react";
import { RepoList } from "@/components/repo-list";
import { AnalysisConfig } from "@/components/analysis-config";
import { AnalysisHistory } from "@/components/analysis-history";
import type { RepoSummary } from "@/types";

export default function DashboardPage() {
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        {selectedRepo ? "Configure Analysis" : "Select a Repository"}
      </h1>

      {selectedRepo ? (
        <AnalysisConfig
          repo={selectedRepo}
          onBack={() => setSelectedRepo(null)}
        />
      ) : (
        <>
          <RepoList onSelect={setSelectedRepo} />
          <AnalysisHistory />
        </>
      )}
    </div>
  );
}
