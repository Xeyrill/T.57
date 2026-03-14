# T.57 — DevOps Agent

> Multi-agent AI tool that scans GitHub repositories for security vulnerabilities, code quality issues, and documentation gaps.

```
 _____ ___ _____
|_   _| ____|___  |
  | | |  _|   / /
  | | |___|  / /
  |_|      /_/
  DEVOPS AGENT
```

## Quick Start

### Frontend (Next.js)

```bash
cd devops-agent
npm install
npm run dev
# → http://localhost:3000
```

### Backend (FastAPI)

```bash
cd devops-agent/backend
pip install -r requirements.txt
cp ../.env.example ../.env  # add your keys
uvicorn main:app --reload --port 8000
```

## How It Works

1. **Paste** a public GitHub repo URL
2. **Three agents** run concurrently:
   - 🛡️ **Security Agent** — SQL injection, hardcoded secrets, vulnerable deps
   - ⚡ **Quality Agent** — cyclomatic complexity, code smells, long functions
   - 📄 **Docs Agent** — README quality, docstrings, inline comments
3. **Results** merged with weighted scoring (Security 40%, Quality 35%, Docs 25%)

## Architecture

```
Frontend (Next.js)
  └─ /api/analyze (proxy)
       └─ FastAPI Backend
            ├─ GitHub API → fetch repo files
            └─ asyncio.gather(
                 security_agent(),
                 quality_agent(),
                 docs_agent()
               ) → merge → respond
```

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, Tailwind CSS v4, TypeScript |
| Backend | FastAPI, Python 3.11+ |
| AI | OpenAI GPT-4o-mini (or rule-based fallback) |
| Fonts | Anton (stencil), Space Mono |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | Optional | Enables AI-powered analysis (falls back to rule-based) |
| `GITHUB_TOKEN` | Optional | Increases GitHub API rate limit |

## Team

**Team 57** — Hackathon build

## Git Workflow

1. Create a branch: `git checkout -b feature/your-feature`
2. Make changes & commit
3. Push & create a Pull Request
4. Get review → merge to `main`
