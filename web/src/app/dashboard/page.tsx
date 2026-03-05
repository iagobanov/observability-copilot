"use client";

import { useEffect, useState } from "react";
import { RepoList } from "@/components/repo-list";
import { AnalysisConfig } from "@/components/analysis-config";
import { AnalysisHistory } from "@/components/analysis-history";
import { OrgHealthCard } from "@/components/org-health-card";
import { fetchDashboardData } from "@/lib/history";
import type { RepoSummary, DashboardData } from "@/types";

export default function DashboardPage() {
  const [selectedRepo, setSelectedRepo] = useState<RepoSummary | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData()
      .then(setDashboard)
      .finally(() => setLoading(false));
  }, []);

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
          {dashboard && dashboard.orgs.length > 0 && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              {dashboard.orgs.map((org) => (
                <OrgHealthCard
                  key={org.owner}
                  org={org}
                  trends={dashboard.repoTrends.filter(
                    (t) => t.owner === org.owner
                  )}
                />
              ))}
            </div>
          )}
          <RepoList onSelect={setSelectedRepo} />
          <AnalysisHistory
            runs={dashboard?.recentRuns ?? []}
            repoTrends={dashboard?.repoTrends ?? []}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
