#!/usr/bin/env python3
"""Observability analysis via the Anthropic API."""

import os

import anthropic

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")
# When running inside the Docker container, files live at /
if not os.path.isdir(PROMPTS_DIR):
    PROMPTS_DIR = "/prompts"

LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".jsx": "jsx",
    ".go": "go",
    ".java": "java",
    ".rb": "ruby",
    ".rs": "rust",
    ".cs": "csharp",
    ".kt": "kotlin",
    ".scala": "scala",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".json": "json",
    ".toml": "toml",
    ".xml": "xml",
    ".sql": "sql",
    ".sh": "bash",
    ".dockerfile": "dockerfile",
    ".tf": "hcl",
    ".proto": "protobuf",
}


def _language_for(filename: str) -> str:
    basename = os.path.basename(filename).lower()
    if basename == "dockerfile":
        return "dockerfile"
    _, ext = os.path.splitext(basename)
    return LANGUAGE_MAP.get(ext, "")


def _build_user_message(
    repo_name: str, stack: str, file_contents: dict[str, str]
) -> str:
    parts = [
        f"Repository: {repo_name}",
        f"Language/Framework detected: {stack}",
        "",
        f"## Files analyzed ({len(file_contents)} files):",
        "",
    ]
    for path, content in file_contents.items():
        lang = _language_for(path)
        parts.append(f"### {path}")
        parts.append(f"```{lang}")
        parts.append(content)
        parts.append("```")
        parts.append("")

    parts.append(
        "Analyze this repository for observability gaps and provide your full report."
    )
    return "\n".join(parts)


def analyze_repository(
    api_key: str,
    repo_name: str,
    stack: str,
    file_contents: dict[str, str],
) -> str:
    """Send the repository contents to Claude for observability analysis."""
    system_prompt_path = os.path.join(PROMPTS_DIR, "system.md")
    with open(system_prompt_path, "r") as f:
        system_prompt = f.read()

    user_message = _build_user_message(repo_name, stack, file_contents)

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    # Extract text from response
    text_parts = []
    for block in response.content:
        if block.type == "text":
            text_parts.append(block.text)

    return "\n".join(text_parts)
