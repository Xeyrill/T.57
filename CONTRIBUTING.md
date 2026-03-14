# Contributing to T.57 DevOps Agent

## Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- npm

### 1. Clone & Install Frontend

```bash
git clone https://github.com/Xeyrill/T.57.git
cd T.57/devops-agent
npm install
```

### 2. Install Backend

```bash
cd backend
pip install -r requirements.txt
```

### 3. Environment Variables

```bash
cp .env.example .env
# Edit .env and add your keys (optional)
```

### 4. Run

```bash
# Terminal 1 — Frontend
npm run dev

# Terminal 2 — Backend (optional, frontend works with mock data)
cd backend && uvicorn main:app --reload --port 8000
```

## Project Structure

```
devops-agent/
├── src/app/           # Next.js pages & API routes
├── src/components/    # React components (Dashboard)
├── backend/           # FastAPI + AI agents
└── demo-app/          # Intentionally vulnerable test repo
```

## Branch Naming

- `feature/description` — new features
- `fix/description` — bug fixes
- `style/description` — UI changes

## Commit Messages

Use short, descriptive commits:
```
feat: add security agent scoring
fix: handle empty repo response
style: update card hover animation
```

## Pull Requests

1. Create feature branch from `main`
2. Make changes
3. Test locally (both frontend + backend)
4. Push and open PR
5. Wait for team review
