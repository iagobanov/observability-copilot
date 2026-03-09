"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MarkdownReport } from "@/components/markdown-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Report {
  id: string;
  owner: string;
  repo: string;
  score: number | null;
  stack: string;
  focusPath: string;
  fullMarkdown: string;
  createdAt: string;
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/report/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Report not found" : "Failed to load report");
        return res.json();
      })
      .then(setReport)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{error}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const scoreBadgeColor =
    report.score === null
      ? ""
      : report.score < 4
        ? "bg-red-500/15 text-red-700 dark:text-red-400"
        : report.score <= 6
          ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
          : "bg-green-500/15 text-green-700 dark:text-green-400";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {report.owner}/{report.repo}
          </h1>
          {report.score !== null && (
            <Badge variant="secondary" className={scoreBadgeColor}>
              {report.score}/10
            </Badge>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">Dashboard</Link>
        </Button>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <time>{new Date(report.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</time>
        {report.stack && <span>&middot; {report.stack}</span>}
        {report.focusPath && <span>&middot; {report.focusPath}</span>}
      </div>

      <MarkdownReport content={report.fullMarkdown} />
    </div>
  );
}
