import { LANGUAGE_MAP } from "./constants";

function languageFor(filename: string): string {
  const base = filename.split("/").pop()?.toLowerCase() ?? "";
  if (base === "dockerfile") return "dockerfile";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  const ext = base.slice(dot);
  return LANGUAGE_MAP[ext] ?? "";
}

export function buildUserMessage(
  repoName: string,
  stack: string,
  fileContents: Map<string, string>
): string {
  const parts: string[] = [
    `Repository: ${repoName}`,
    `Language/Framework detected: ${stack}`,
    "",
    `## Files analyzed (${fileContents.size} files):`,
    "",
  ];

  for (const [path, content] of fileContents) {
    const lang = languageFor(path);
    parts.push(`### ${path}`);
    parts.push(`\`\`\`${lang}`);
    parts.push(content);
    parts.push("```");
    parts.push("");
  }

  parts.push(
    "Analyze this repository for observability gaps and provide your full report."
  );

  return parts.join("\n");
}
