"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "observability-copilot-api-key";

export function ApiKeyInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) onChange(stored);
  }, [onChange]);

  const handleChange = (val: string) => {
    onChange(val);
    if (val) {
      sessionStorage.setItem(STORAGE_KEY, val);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Anthropic API Key</label>
      <div className="relative">
        <Input
          type={visible ? "text" : "password"}
          placeholder="sk-ant-..."
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className="pr-16 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Stored in your browser session only. Never sent to our servers.
      </p>
    </div>
  );
}
