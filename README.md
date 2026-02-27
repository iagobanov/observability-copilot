# Observability Copilot

A GitHub Action that analyzes your repository for observability gaps and posts actionable findings as a PR comment. Powered by Claude claude-opus-4-5.

## What it does

On every pull request, Observability Copilot:

1. Scans your repository files (manifests, routes, handlers, configs)
2. Detects your language and framework
3. Sends the codebase to Claude for deep observability analysis
4. Posts a detailed PR comment with:
   - Business domain analysis
   - Current observability coverage score
   - Prioritized gaps with working OTel code snippets
   - Missing business metrics
   - Copy-paste quick wins

## Usage

Add to `.github/workflows/observability.yml` in any repo:

```yaml
name: Observability Copilot
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  observability:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/observability-copilot@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

Add `ANTHROPIC_API_KEY` to your repo secrets. That's it.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic_api_key` | Yes | — | Your Anthropic API key |
| `github_token` | Yes | `${{ github.token }}` | GitHub token for posting comments |
| `max_files` | No | `50` | Max files to analyze (avoids token limits) |
| `focus_path` | No | `""` | Limit analysis to a specific folder |

## Examples

### Focus on backend code only

```yaml
- uses: your-org/observability-copilot@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    focus_path: "src/api/"
```

### Analyze more files

```yaml
- uses: your-org/observability-copilot@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    max_files: 100
```

## How it works

1. **File collection** — Fetches repo files via GitHub API, prioritizing package manifests, route/handler files, and main application files. Skips binaries, lock files, and build artifacts.
2. **Stack detection** — Reads manifest files to identify language and framework (Express, Django, Spring Boot, Gin, etc.).
3. **Analysis** — Sends file contents to Claude with a specialized observability-focused system prompt.
4. **PR comment** — Posts (or updates) a structured comment on the PR with gaps, recommendations, and code snippets.

## Supported stacks

- **Node.js**: Express, Fastify, NestJS, Next.js, Koa, Hapi
- **Python**: Django, Flask, FastAPI, Starlette, Celery
- **Go**: Gin, Echo, Gorilla Mux, Fiber
- **Java**: Spring Boot, Quarkus, Micronaut
- **Ruby**: Rails, Sinatra
- **Rust**: Actix, Axum, Rocket
- **C# / .NET**
- **Kotlin**: Ktor

## License

MIT
