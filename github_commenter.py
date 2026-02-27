#!/usr/bin/env python3
"""Post observability analysis as a PR comment via PyGithub."""

import json
import sys

from github import Github

COMMENT_MARKER = "<!-- observability-copilot -->"


def _get_pr_number(event_path: str) -> int | None:
    """Extract the pull request number from the GitHub event JSON."""
    try:
        with open(event_path, "r") as f:
            event = json.load(f)
        return event.get("pull_request", {}).get("number")
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        return None


def post_comment(
    github_token: str,
    repo_name: str,
    event_path: str,
    analysis: str,
) -> None:
    """Delete any previous bot comment and post a new one on the PR."""
    pr_number = _get_pr_number(event_path)
    if pr_number is None:
        print("::warning::Could not determine PR number from event payload")
        sys.exit(0)

    gh = Github(github_token)
    repo = gh.get_repo(repo_name)
    pr = repo.get_pull(pr_number)

    # Delete previous comment from this bot
    for comment in pr.get_issue_comments():
        if comment.body.startswith(COMMENT_MARKER):
            comment.delete()

    # Build and post the new comment
    body = (
        f"{COMMENT_MARKER}\n"
        f"## \U0001f52d Observability Copilot\n\n"
        f"{analysis}\n\n"
        f"---\n"
        f"*Powered by [Observability Copilot](https://github.com/{repo_name}) "
        f"using Claude claude-opus-4-5*"
    )

    pr.create_issue_comment(body)
    print(f"Posted analysis comment on PR #{pr_number}")
