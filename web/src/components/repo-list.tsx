"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepoSummary } from "@/types";

export function RepoList({
  onSelect,
}: {
  onSelect: (repo: RepoSummary) => void;
}) {
  const [repos, setRepos] = useState<RepoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/repos")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRepos(data.repos);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load repositories: {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search repositories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No repositories found
          </p>
        )}
        {filtered.map((repo) => (
          <button
            key={repo.id}
            onClick={() => onSelect(repo)}
            className="flex w-full items-start gap-3 rounded-lg border border-transparent p-3 text-left transition-colors hover:border-border hover:bg-accent"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{repo.full_name}</span>
                {repo.private && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Private
                  </Badge>
                )}
              </div>
              {repo.description && (
                <p className="mt-0.5 text-sm text-muted-foreground truncate">
                  {repo.description}
                </p>
              )}
            </div>
            {repo.language && (
              <span className="text-xs text-muted-foreground shrink-0">
                {repo.language}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
