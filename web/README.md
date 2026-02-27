# Observability Copilot — Web UI

A browser-based interface for running observability analysis on any GitHub repository. Sign in with GitHub, pick a repo, and get a real-time streamed report of missing traces, metrics, and business instrumentation — with working OpenTelemetry code to fix each gap.

## How it works

1. **Sign in with GitHub** — OAuth grants access to your public and private repos
2. **Pick a repository** — searchable list of all your repos, sorted by recent activity
3. **Configure** — optionally set a focus path (e.g. `src/api/`) and max files to analyze
4. **Provide your Anthropic API key** — stored in browser `sessionStorage` only, never sent to our servers
5. **Run analysis** — the server fetches your repo tree, filters and prioritizes files, detects your stack, and streams a Claude-powered observability analysis back to the browser in real time

### What the analysis covers

- Business domain understanding
- Current observability coverage score (X/10)
- Prioritized gaps (critical / important / nice-to-have) with file-specific code snippets
- Missing business metrics and the questions they'd answer
- OTel SDK setup instructions for your exact stack
- Top quick wins you can copy-paste

## Tech stack

- **Next.js 15** (App Router) with TypeScript
- **Tailwind CSS v4** + **shadcn/ui** components
- **NextAuth v5** (GitHub OAuth, `repo` scope)
- **@octokit/rest** for GitHub API
- **@anthropic-ai/sdk** for Claude streaming
- **SSE** (Server-Sent Events) for real-time analysis delivery
- **react-markdown** + **rehype-highlight** for rendered reports with syntax highlighting

## Getting started

### Prerequisites

1. Create a **GitHub OAuth App** at https://github.com/settings/developers
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
2. Copy the Client ID and Client Secret

### Setup

```bash
cd web
npm install

# Create your env file from the example
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```
GITHUB_ID=<your GitHub OAuth App Client ID>
GITHUB_SECRET=<your GitHub OAuth App Client Secret>
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

### Run

```bash
npm run dev
```

Open http://localhost:3000, sign in with GitHub, select a repo, enter your Anthropic API key, and click **Run Observability Analysis**.

## Project structure

```
web/
├── middleware.ts                         # Auth guard for /dashboard, /analysis
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Landing page
│   │   ├── dashboard/page.tsx            # Repo selector + analysis config
│   │   ├── analysis/[owner]/[repo]/      # Streaming analysis results
│   │   └── api/
│   │       ├── auth/[...nextauth]/       # NextAuth GitHub OAuth
│   │       ├── repos/route.ts            # GET user's repos
│   │       └── analyze/route.ts          # POST → SSE streaming analysis
│   ├── lib/
│   │   ├── auth.ts                       # NextAuth config
│   │   ├── github.ts                     # Octokit helpers
│   │   └── analyzer/                     # TypeScript port of Python engine
│   │       ├── constants.ts              # SKIP_DIRS, MANIFEST_FILES, etc.
│   │       ├── file-filter.ts            # shouldSkip(), priorityKey()
│   │       ├── stack-detector.ts         # detectStack()
│   │       ├── message-builder.ts        # buildUserMessage()
│   │       └── system-prompt.ts          # Claude system prompt
│   ├── components/                       # UI components
│   ├── hooks/use-analysis-stream.ts      # SSE consumer hook
│   └── types/index.ts                    # TypeScript interfaces
```

## Data flow

```
Browser → Sign in (GitHub OAuth) → JWT session with access_token
Browser → GET /api/repos → GitHub API → repo list
Browser → POST /api/analyze { owner, repo, apiKey, focusPath, maxFiles }
  Server → GitHub API: fetch tree → filter → fetch contents → detect stack
  Server → Anthropic API: stream analysis (user's API key)
  Server → SSE: progress events + analysis chunks → Browser renders markdown live
```

## Security

- **BYOK (Bring Your Own Key)**: The Anthropic API key is stored in `sessionStorage` only and sent per-request. It is never persisted server-side or logged.
- **GitHub token**: The OAuth access token is stored in an encrypted JWT cookie managed by NextAuth. It is only used server-side to call the GitHub API on behalf of the user.
- **No data persistence**: No analysis results, repo contents, or user data are stored. Everything is ephemeral.
