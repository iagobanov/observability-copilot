# Observability Copilot

Analyze any repository for observability gaps and get actionable OpenTelemetry instrumentation recommendations. Powered by Claude.

**Two ways to use it:**

- **[Web UI](web/)** — Sign in with GitHub, pick a repo, get a real-time streamed analysis in your browser. No CI/CD setup required.
- **GitHub Action** — Add to any repo and get observability reports as PR comments automatically.

## Web UI

See [`web/README.md`](web/README.md) for setup instructions. Quick start:

```bash
cd web
cp .env.local.example .env.local  # fill in GitHub OAuth + NextAuth secret
npm install && npm run dev
```

## GitHub Action

On every pull request, the GitHub Action:

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

## Where this is headed

Right now Observability Copilot is a one-shot analysis — you point it at a repo, it tells you what's missing. Useful, but the real product is **longitudinal observability health**: tracking how coverage evolves over time and surfacing that across an org.

### Next steps to get to product-level

- **Persistence** — Store analysis results (coverage score, gap count, stack detected) in a database. Each run becomes a data point, not a throwaway report.
- **Coverage score tracking** — Plot observability scores over time per repo. Show whether instrumentation is improving or regressing.
- **PR-level diffs** — Compare analysis before/after a PR. Did this change introduce new gaps? Did it close existing ones? Surface that in the PR itself.
- **Org dashboard** — Aggregate view across all repos in an org. Which repos are well-instrumented, which are flying blind. Rank by risk.
- **Alerts** — Notify when a repo's coverage score drops below a threshold, or when a PR introduces critical observability gaps.
- **Scheduled scans** — Run analysis on a cron (weekly/monthly) without waiting for PRs. Track drift.
- **Team ownership mapping** — Connect repos to teams so the org dashboard shows coverage by team, not just by repo.

The analysis engine is the extraction step. Everything above turns it into a product.

## License

MIT
