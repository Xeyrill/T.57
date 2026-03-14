# RepoGuardian

> Multi-agent AI tool that scans GitHub repositories for security vulnerabilities, code quality issues, and documentation gaps.

```
 ____                   ____                     _ _
|  _ \ ___ _ __   ___  / ___|_   _  __ _ _ __ __| (_) __ _ _ __
| |_) / _ \ '_ \ / _ \| |  _| | | |/ _` | '__/ _` | |/ _` | '_ \
|  _ <  __/ |_) | (_) | |_| | |_| | (_| | | | (_| | | (_| | | | |
|_| \_\___| .__/ \___/ \____|\__,_|\__,_|_|  \__,_|_|\__,_|_| |_|
          |_|
```

## Quick Start

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FXeyrill%2FT.57)

Or via CLI:
```bash
npx vercel
```

### Run Locally

```bash
git clone https://github.com/Xeyrill/T.57.git
cd T.57
npm install
npm run dev
# -> http://localhost:3000
```

## How It Works

1. **Paste** a public GitHub repo URL
2. **Three agents** scan concurrently:
   - 🛡️ **Security Agent** — SQL injection, hardcoded secrets, eval/exec, command injection
   - ⚡ **Quality Agent** — function length, nesting depth, complexity, comments
   - 📄 **Docs Agent** — README quality, docstrings, JSDoc coverage
3. **Weighted scoring**: Security 40% | Quality 35% | Docs 25%

## Architecture

```
Next.js App (Vercel Serverless)
  └─ /api/analyze (POST)
       ├─ GitHub REST API → fetch repo files
       ├─ securityAgent(files)
       ├─ qualityAgent(files)
       ├─ docsAgent(files)
       └─ mergeResults() → respond
```

Everything runs as a **single Vercel serverless function** — no separate backend needed.

## Environment Variables (Optional)

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Increases GitHub API rate limit (60 → 5000 reqs/hr) |
| `OPENAI_API_KEY` | Enables AI-powered analysis (future enhancement) |

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16, TypeScript, Tailwind CSS v4 |
| Deploy | Vercel (zero-config) |
| Design | Monotone vintage + Gen Z street art |
| Fonts | Anton (stencil), Space Mono |

## Team

**Team 57** — Built by Xeyrill

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and git workflow.
