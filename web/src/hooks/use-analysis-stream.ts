"use client";

import { useState, useCallback } from "react";
import type { AnalysisConfig, AnalysisState, StreamEvent } from "@/types";

const INITIAL_STATE: AnalysisState = {
  status: "idle",
  progress: [],
  analysisText: "",
  error: null,
};

export function useAnalysisStream() {
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);

  const startAnalysis = useCallback(async (config: AnalysisConfig) => {
    setState({
      status: "connecting",
      progress: ["Connecting..."],
      analysisText: "",
      error: null,
    });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const text = await response.text();
        setState((s) => ({
          ...s,
          status: "error",
          error: text || `HTTP ${response.status}`,
        }));
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const dataLine = line.trim();
          if (!dataLine.startsWith("data: ")) continue;

          const json = dataLine.slice(6);
          let event: StreamEvent;
          try {
            event = JSON.parse(json);
          } catch {
            continue;
          }

          switch (event.type) {
            case "progress":
              setState((s) => ({
                ...s,
                status:
                  event.stage === "tree"
                    ? "fetching_tree"
                    : event.stage === "fetch"
                      ? "fetching_files"
                      : event.stage === "analyze"
                        ? "analyzing"
                        : s.status,
                progress: [...s.progress, event.detail],
              }));
              break;

            case "analysis_start":
              setState((s) => ({ ...s, status: "analyzing" }));
              break;

            case "analysis_delta":
              setState((s) => ({
                ...s,
                analysisText: s.analysisText + event.text,
              }));
              break;

            case "analysis_done":
              setState((s) => ({
                ...s,
                status: "done",
                analysisText: event.fullText,
              }));
              break;

            case "error":
              setState((s) => ({
                ...s,
                status: "error",
                error: event.message,
              }));
              break;
          }
        }
      }
    } catch (error) {
      setState((s) => ({
        ...s,
        status: "error",
        error: error instanceof Error ? error.message : "Connection failed",
      }));
    }
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return { state, startAnalysis, reset };
}
