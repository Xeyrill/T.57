"""
DevOps Agent — FastAPI Backend
Multi-agent repository analysis with GitHub integration.
"""

import asyncio
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents import security_agent, quality_agent, docs_agent, merge_agent_results
from github_client import fetch_repo_contents

load_dotenv()

app = FastAPI(
    title="DevOps Agent API",
    description="Multi-agent AI repository analysis",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ──────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    github_url: str


class Issue(BaseModel):
    type: str
    severity: str
    file: str
    message: str


class AnalysisResult(BaseModel):
    score: int
    issues: list[Issue]
    recommendations: list[str]


# ─── Endpoints ───────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "online", "service": "DevOps Agent API", "agents": 3}


@app.post("/fetch-repo")
async def fetch_repo(request: AnalyzeRequest):
    """Fetch file tree and contents from a public GitHub repo."""
    try:
        token = os.getenv("GITHUB_TOKEN")
        contents = fetch_repo_contents(request.github_url, token)
        return {
            "files_fetched": len(contents),
            "files": {path: content[:500] + "..." if len(content) > 500 else content for path, content in contents.items()},
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching repo: {str(e)}")


@app.post("/analyze", response_model=AnalysisResult)
async def analyze(request: AnalyzeRequest):
    """
    Full analysis pipeline:
    1. Fetch repo contents from GitHub
    2. Run 3 agents concurrently (Security, Quality, Docs)
    3. Merge results with weighted scoring
    4. Return final analysis
    """
    try:
        # Step 1: Fetch repo
        token = os.getenv("GITHUB_TOKEN")
        files = fetch_repo_contents(request.github_url, token)

        if not files:
            raise HTTPException(status_code=404, detail="No analyzable files found in repository")

        # Step 2: Run all 3 agents concurrently
        sec_result, qual_result, doc_result = await asyncio.gather(
            security_agent(files),
            quality_agent(files),
            docs_agent(files),
        )

        # Step 3: Merge and calculate weighted score
        result = merge_agent_results(sec_result, qual_result, doc_result)

        return AnalysisResult(**result)

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
