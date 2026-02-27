import type { AnalysisRecord } from "@/types";

const STORAGE_KEY = "observability-copilot-history";
const MAX_RECORDS = 50;

export function parseScore(markdown: string): number | null {
  const match = markdown.match(/Coverage score:\s*(\d+)\/10/i);
  return match ? parseInt(match[1], 10) : null;
}

export function saveAnalysis(record: AnalysisRecord): void {
  const history = getHistory();
  const filtered = history.filter(
    (r) => !(r.owner === record.owner && r.repo === record.repo)
  );
  filtered.unshift(record);
  const capped = filtered.slice(0, MAX_RECORDS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
}

export function getHistory(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: AnalysisRecord[] = JSON.parse(raw);
    return parsed.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
}
