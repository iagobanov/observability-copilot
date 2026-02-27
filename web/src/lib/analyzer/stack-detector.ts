import { STACK_SIGNATURES } from "./constants";

export function detectStack(fileContents: Map<string, string>): string {
  const detected: string[] = [];

  for (const [manifestName, signatures] of Object.entries(STACK_SIGNATURES)) {
    let content = "";
    for (const [path, body] of fileContents) {
      if (path.endsWith(manifestName)) {
        content = body.toLowerCase();
        break;
      }
    }
    if (!content) continue;

    for (const [keyword, stack] of Object.entries(signatures)) {
      if (content.includes(keyword.toLowerCase())) {
        if (!detected.includes(stack)) {
          detected.push(stack);
        }
      }
    }
  }

  if (detected.length > 0) return detected.join(", ");

  // Fallback: guess from file extensions
  const extensions = new Set<string>();
  for (const path of fileContents.keys()) {
    const dot = path.lastIndexOf(".");
    if (dot > 0) extensions.add(path.slice(dot));
  }

  if (extensions.has(".py")) return "Python";
  if (extensions.has(".ts") || extensions.has(".js")) return "JavaScript/TypeScript";
  if (extensions.has(".go")) return "Go";
  if (extensions.has(".java")) return "Java";
  if (extensions.has(".rb")) return "Ruby";
  if (extensions.has(".rs")) return "Rust";
  if (extensions.has(".cs")) return "C# / .NET";

  return "Unknown";
}
