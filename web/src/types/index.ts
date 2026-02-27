export interface RepoSummary {
  id: number;
  name: string;
  full_name: string;
  owner: string;
  description: string | null;
  language: string | null;
  private: boolean;
  updated_at: string;
  default_branch: string;
}

export interface AnalysisConfig {
  owner: string;
  repo: string;
  anthropicApiKey: string;
  focusPath: string;
  maxFiles: number;
}

export type StreamEventType =
  | "progress"
  | "analysis_start"
  | "analysis_delta"
  | "analysis_done"
  | "error";

export interface ProgressEvent {
  type: "progress";
  stage: string;
  detail: string;
}

export interface AnalysisStartEvent {
  type: "analysis_start";
}

export interface AnalysisDeltaEvent {
  type: "analysis_delta";
  text: string;
}

export interface AnalysisDoneEvent {
  type: "analysis_done";
  fullText: string;
}

export interface ErrorEvent {
  type: "error";
  message: string;
}

export type StreamEvent =
  | ProgressEvent
  | AnalysisStartEvent
  | AnalysisDeltaEvent
  | AnalysisDoneEvent
  | ErrorEvent;

export type AnalysisStatus =
  | "idle"
  | "connecting"
  | "fetching_tree"
  | "fetching_files"
  | "analyzing"
  | "done"
  | "error";

export interface AnalysisState {
  status: AnalysisStatus;
  progress: string[];
  analysisText: string;
  detectedStack: string;
  error: string | null;
}

export interface AnalysisRecord {
  owner: string;
  repo: string;
  score: number | null;
  stack: string;
  date: string;
  focusPath: string;
}
