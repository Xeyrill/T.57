"""
GitHub API client for fetching repository contents.
"""

import re
from typing import Optional
import requests


# File extensions we care about for analysis
RELEVANT_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx", ".json", ".yml", ".yaml",
    ".toml", ".cfg", ".ini", ".env", ".sh", ".bash",
}
RELEVANT_FILENAMES = {"README.md", "README", "readme.md", "Dockerfile", "Makefile", ".gitignore"}
MAX_FILE_SIZE = 50_000  # 50KB per file
MAX_FILES = 15  # Limit files fetched to avoid rate limits


def parse_github_url(url: str) -> tuple[str, str]:
    """Extract owner and repo from a GitHub URL."""
    # Match patterns like:
    #   https://github.com/owner/repo
    #   https://github.com/owner/repo.git
    #   github.com/owner/repo
    pattern = r"(?:https?://)?github\.com/([^/]+)/([^/.]+)"
    match = re.match(pattern, url.strip().rstrip("/"))
    if not match:
        raise ValueError(f"Invalid GitHub URL: {url}")
    return match.group(1), match.group(2)


def fetch_file_tree(owner: str, repo: str, token: Optional[str] = None) -> list[dict]:
    """Fetch the file tree of a GitHub repository."""
    headers = {"Accept": "application/vnd.github.v3+json"}
    if token:
        headers["Authorization"] = f"token {token}"

    # Get the default branch
    repo_url = f"https://api.github.com/repos/{owner}/{repo}"
    repo_resp = requests.get(repo_url, headers=headers, timeout=15)
    repo_resp.raise_for_status()
    default_branch = repo_resp.json().get("default_branch", "main")

    # Get tree recursively
    tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
    tree_resp = requests.get(tree_url, headers=headers, timeout=15)
    tree_resp.raise_for_status()

    tree_data = tree_resp.json()
    files = []
    for item in tree_data.get("tree", []):
        if item["type"] == "blob":
            files.append({
                "path": item["path"],
                "size": item.get("size", 0),
                "sha": item["sha"],
            })
    return files


def _is_relevant_file(path: str) -> bool:
    """Check if a file is relevant for analysis."""
    filename = path.split("/")[-1]
    if filename in RELEVANT_FILENAMES:
        return True
    ext = "." + filename.rsplit(".", 1)[-1] if "." in filename else ""
    return ext in RELEVANT_EXTENSIONS


def fetch_file_content(owner: str, repo: str, path: str, token: Optional[str] = None) -> str:
    """Fetch the raw content of a single file."""
    headers = {"Accept": "application/vnd.github.v3.raw"}
    if token:
        headers["Authorization"] = f"token {token}"

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    resp = requests.get(url, headers=headers, timeout=15)
    resp.raise_for_status()
    return resp.text


def fetch_repo_contents(github_url: str, token: Optional[str] = None) -> dict[str, str]:
    """
    Fetch relevant file contents from a GitHub repository.
    Returns a dict mapping file paths to their contents.
    """
    owner, repo = parse_github_url(github_url)
    tree = fetch_file_tree(owner, repo, token)

    # Filter to relevant files, sorted by priority (smaller files first)
    relevant = [f for f in tree if _is_relevant_file(f["path"]) and f["size"] <= MAX_FILE_SIZE]
    relevant.sort(key=lambda f: f["size"])
    relevant = relevant[:MAX_FILES]

    contents: dict[str, str] = {}
    for file_info in relevant:
        try:
            content = fetch_file_content(owner, repo, file_info["path"], token)
            contents[file_info["path"]] = content
        except Exception as e:
            print(f"Warning: Could not fetch {file_info['path']}: {e}")

    return contents
