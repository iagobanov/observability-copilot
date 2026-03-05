"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { ScoreDataPoint } from "@/types";

export function RepoSparkline({ dataPoints }: { dataPoints: ScoreDataPoint[] }) {
  if (dataPoints.length < 2) return null;

  return (
    <div className="w-[120px] h-[32px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dataPoints}>
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-chart-1)"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
