import {
  SKIP_DIRS,
  SKIP_EXTENSIONS,
  MANIFEST_FILES,
  MANIFEST_EXTENSIONS,
  ROUTE_DIRS,
  MAIN_FILE_NAMES,
  CONFIG_FILE_NAMES,
} from "./constants";

function extname(path: string): string {
  const lastDot = path.lastIndexOf(".");
  if (lastDot <= 0) return "";
  return path.slice(lastDot);
}

function basename(path: string): string {
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? path : path.slice(lastSlash + 1);
}

export function shouldSkip(path: string): boolean {
  const parts = path.split("/");
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) return true;
  }
  const ext = extname(path);
  if (SKIP_EXTENSIONS.has(ext)) return true;
  if (path.endsWith(".min.js") || path.endsWith(".min.css")) return true;
  return false;
}

export function priorityKey(path: string): number {
  const name = basename(path);
  const ext = extname(name);

  // 0 — manifests
  if (MANIFEST_FILES.has(name) || MANIFEST_EXTENSIONS.has(ext)) return 0;

  // 1 — route/handler files
  const parts = path.split("/");
  if (parts.some((d) => ROUTE_DIRS.has(d))) return 1;

  // 2 — main application files
  if (MAIN_FILE_NAMES.has(name)) return 2;

  // 3 — config files
  if (CONFIG_FILE_NAMES.has(name)) return 3;

  // 4 — everything else
  return 4;
}

export function filterAndPrioritize(
  paths: string[],
  focusPath: string,
  maxFiles: number
): string[] {
  let filtered = paths.filter((p) => !shouldSkip(p));

  if (focusPath) {
    filtered = filtered.filter((p) => p.startsWith(focusPath));
  }

  filtered.sort((a, b) => {
    const pa = priorityKey(a);
    const pb = priorityKey(b);
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });

  return filtered.slice(0, maxFiles);
}
