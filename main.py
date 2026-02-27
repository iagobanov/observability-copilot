#!/usr/bin/env python3
"""Observability Copilot — GitHub Action entry point.

Orchestrates repo file collection, analysis via Claude, and PR commenting.
"""

import json
import os
import sys

from github import Auth, Github

from analyzer import analyze_repository
from github_commenter import post_comment

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SKIP_DIRS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "__pycache__",
    ".next",
    ".nuxt",
    "vendor",
    "target",
    ".terraform",
    "coverage",
    ".pytest_cache",
    ".mypy_cache",
}

SKIP_EXTENSIONS = {
    ".lock",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".mp3",
    ".zip",
    ".tar",
    ".gz",
    ".pdf",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".pyc",
    ".pyo",
    ".class",
    ".o",
    ".a",
    ".min.js",
    ".min.css",
    ".map",
}

MANIFEST_FILES = {
    "package.json",
    "requirements.txt",
    "setup.py",
    "setup.cfg",
    "pyproject.toml",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "go.mod",
    "Gemfile",
    "Cargo.toml",
    "composer.json",
}

MANIFEST_EXTENSIONS = {".csproj", ".fsproj", ".sln"}

ROUTE_DIRS = {"routes", "controllers", "handlers", "api", "views", "endpoints", "routers"}

MAIN_FILE_NAMES = {
    "main.py",
    "app.py",
    "server.py",
    "index.ts",
    "index.js",
    "app.ts",
    "app.js",
    "server.ts",
    "server.js",
    "main.go",
    "main.rs",
    "Main.java",
    "Application.java",
    "Program.cs",
    "Startup.cs",
    "main.rb",
    "app.rb",
    "config.ru",
}

# ---------------------------------------------------------------------------
# Stack detection
# ---------------------------------------------------------------------------

STACK_SIGNATURES = {
    "package.json": {
        "express": "Node.js / Express",
        "fastify": "Node.js / Fastify",
        "next": "Node.js / Next.js",
        "nuxt": "Node.js / Nuxt",
        "nestjs": "Node.js / NestJS",
        "@hapi": "Node.js / Hapi",
        "koa": "Node.js / Koa",
        "react": "JavaScript / React",
        "vue": "JavaScript / Vue",
        "angular": "TypeScript / Angular",
    },
    "requirements.txt": {
        "django": "Python / Django",
        "flask": "Python / Flask",
        "fastapi": "Python / FastAPI",
        "starlette": "Python / Starlette",
        "tornado": "Python / Tornado",
        "celery": "Python / Celery",
    },
    "pyproject.toml": {
        "django": "Python / Django",
        "flask": "Python / Flask",
        "fastapi": "Python / FastAPI",
    },
    "go.mod": {
        "gin-gonic": "Go / Gin",
        "gorilla/mux": "Go / Gorilla Mux",
        "labstack/echo": "Go / Echo",
        "fiber": "Go / Fiber",
        "net/http": "Go",
    },
    "Gemfile": {
        "rails": "Ruby / Rails",
        "sinatra": "Ruby / Sinatra",
    },
    "pom.xml": {
        "spring-boot": "Java / Spring Boot",
        "quarkus": "Java / Quarkus",
        "micronaut": "Java / Micronaut",
    },
    "build.gradle": {
        "spring-boot": "Java / Spring Boot",
        "ktor": "Kotlin / Ktor",
    },
    "Cargo.toml": {
        "actix": "Rust / Actix",
        "axum": "Rust / Axum",
        "rocket": "Rust / Rocket",
    },
}


def detect_stack(file_contents: dict[str, str]) -> str:
    """Detect the language/framework from manifest files."""
    detected = []
    for filename, signatures in STACK_SIGNATURES.items():
        content = ""
        for path, body in file_contents.items():
            if path.endswith(filename):
                content = body.lower()
                break
        if not content:
            continue
        for keyword, stack in signatures.items():
            if keyword.lower() in content:
                detected.append(stack)
    if detected:
        return ", ".join(dict.fromkeys(detected))  # dedupe, preserve order
    # Fallback: guess from file extensions
    extensions = {os.path.splitext(p)[1] for p in file_contents}
    if ".py" in extensions:
        return "Python"
    if ".ts" in extensions or ".js" in extensions:
        return "JavaScript/TypeScript"
    if ".go" in extensions:
        return "Go"
    if ".java" in extensions:
        return "Java"
    if ".rb" in extensions:
        return "Ruby"
    if ".rs" in extensions:
        return "Rust"
    if ".cs" in extensions:
        return "C# / .NET"
    return "Unknown"


# ---------------------------------------------------------------------------
# File collection
# ---------------------------------------------------------------------------


def should_skip(path: str) -> bool:
    """Return True if the file should be excluded from analysis."""
    parts = path.split("/")
    for part in parts:
        if part in SKIP_DIRS:
            return True
    _, ext = os.path.splitext(path)
    if ext in SKIP_EXTENSIONS:
        return True
    # Skip files ending with .min.js / .min.css (compound extension)
    if path.endswith(".min.js") or path.endswith(".min.css"):
        return True
    return False


def priority_key(path: str) -> int:
    """Lower number = higher priority for analysis."""
    basename = os.path.basename(path)
    _, ext = os.path.splitext(basename)
    # 0 — manifests
    if basename in MANIFEST_FILES or ext in MANIFEST_EXTENSIONS:
        return 0
    # 1 — route/handler files
    parts = path.split("/")
    if any(d in ROUTE_DIRS for d in parts):
        return 1
    # 2 — main application files
    if basename in MAIN_FILE_NAMES:
        return 2
    # 3 — config files (docker, CI, OTel config)
    if basename in {
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "otel-collector-config.yaml",
        ".env.example",
    }:
        return 3
    # 4 — everything else
    return 4


def collect_files(repo, max_files: int, focus_path: str) -> dict[str, str]:
    """Fetch file contents from the repo, prioritised and capped."""
    tree = repo.get_git_tree(repo.default_branch, recursive=True).tree

    candidates = []
    for item in tree:
        if item.type != "blob":
            continue
        path = item.path
        if focus_path and not path.startswith(focus_path):
            continue
        if should_skip(path):
            continue
        candidates.append(path)

    # Sort by priority then alphabetically within the same tier
    candidates.sort(key=lambda p: (priority_key(p), p))
    candidates = candidates[:max_files]

    file_contents: dict[str, str] = {}
    for path in candidates:
        try:
            blob = repo.get_contents(path, ref=repo.default_branch)
            if blob.encoding == "base64" and blob.size < 100_000:
                content = blob.decoded_content.decode("utf-8", errors="replace")
                file_contents[path] = content
        except Exception:
            continue  # skip unreadable files

    return file_contents


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    api_key = os.environ.get("INPUT_ANTHROPIC_API_KEY", "")
    github_token = os.environ.get("INPUT_GITHUB_TOKEN", "")
    max_files = int(os.environ.get("INPUT_MAX_FILES", "50"))
    focus_path = os.environ.get("INPUT_FOCUS_PATH", "")
    repo_name = os.environ.get("GITHUB_REPOSITORY", "")
    event_path = os.environ.get("GITHUB_EVENT_PATH", "")

    if not api_key:
        print("::error::anthropic_api_key is required")
        sys.exit(1)
    if not github_token:
        print("::error::github_token is required")
        sys.exit(1)
    if not repo_name:
        print("::error::GITHUB_REPOSITORY not set")
        sys.exit(1)

    print(f"Analyzing repository: {repo_name}")
    print(f"Max files: {max_files}, Focus path: {focus_path or '(entire repo)'}")

    # Connect to GitHub
    gh = Github(auth=Auth.Token(github_token))
    repo = gh.get_repo(repo_name)

    # Collect files
    print("Collecting files...")
    file_contents = collect_files(repo, max_files, focus_path)
    print(f"Collected {len(file_contents)} files")

    if not file_contents:
        print("::warning::No files found to analyze")
        sys.exit(0)

    # Detect stack
    stack = detect_stack(file_contents)
    print(f"Detected stack: {stack}")

    # Analyze
    print("Running observability analysis with Claude...")
    analysis = analyze_repository(api_key, repo_name, stack, file_contents)
    print("Analysis complete")

    # Post comment
    print("Posting PR comment...")
    post_comment(github_token, repo_name, event_path, analysis)
    print("Done!")


if __name__ == "__main__":
    main()
