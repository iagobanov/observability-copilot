import type { AnalysisRunSummary, DashboardData } from "@/types";

export function parseScore(markdown: string): number | null {
  const match = markdown.match(/Coverage score:\s*(\d+)\/10/i);
  return match ? parseInt(match[1], 10) : null;
}

export async function fetchHistory(): Promise<AnalysisRunSummary[]> {
  const res = await fetch("/api/history");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchDashboardData(): Promise<DashboardData | null> {
  const res = await fetch("/api/dashboard/trends");
  if (!res.ok) return null;
  return res.json();
}
