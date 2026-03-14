"""
AI Agent functions for repository analysis.
Three concurrent agents: Security, Quality, Documentation.
"""

import json
import os
from typing import Optional
from openai import AsyncOpenAI


def _get_client() -> Optional[AsyncOpenAI]:
    """Get OpenAI client if API key is available."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    return AsyncOpenAI(api_key=api_key)


def _format_code_for_prompt(files: dict[str, str]) -> str:
    """Format file contents into a prompt-friendly string."""
    parts = []
    for path, content in files.items():
        # Truncate very long files for the prompt
        truncated = content[:8000] + "\n... (truncated)" if len(content) > 8000 else content
        parts.append(f"### File: {path}\n```\n{truncated}\n```")
    return "\n\n".join(parts)


# ─── SECURITY AGENT ─────────────────────────────────────────────────

SECURITY_SYSTEM_PROMPT = """You are an elite Cyber Threat Intelligence (CTI) analyst and Application Security (AppSec) engineer.
Your mission is to perform a thorough security audit of the provided source code.

Analyze for:
1. **Injection flaws**: SQL injection, command injection, XSS, LDAP injection
2. **Hardcoded secrets**: API keys, passwords, tokens, connection strings
3. **Vulnerable dependencies**: Known CVEs in imported packages
4. **Authentication issues**: Weak auth, missing auth checks, broken access control
5. **Cryptographic failures**: Weak hashing, insecure random, missing encryption
6. **Configuration issues**: Debug mode in production, CORS misconfig, insecure headers

Return ONLY valid JSON in this exact format, nothing else:
{
  "score": <integer 0-100, where 100 is perfectly secure>,
  "issues": [
    {
      "type": "security",
      "severity": "high" | "medium" | "low",
      "file": "<filename>",
      "message": "<concise description of the vulnerability>"
    }
  ]
}"""


async def security_agent(files: dict[str, str]) -> dict:
    """Run the Security CTI agent on the codebase."""
    client = _get_client()
    code_block = _format_code_for_prompt(files)

    if client:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SECURITY_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Analyze the following codebase for security vulnerabilities:\n\n{code_block}"},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            # Ensure all issues have type "security"
            for issue in result.get("issues", []):
                issue["type"] = "security"
            return result
        except Exception as e:
            print(f"Security agent LLM error: {e}")

    # Fallback: rule-based analysis
    return _fallback_security_scan(files)


def _fallback_security_scan(files: dict[str, str]) -> dict:
    """Simple rule-based security scan as fallback."""
    issues = []
    score = 100

    patterns = {
        "SQL Injection": [
            ("execute(", "f\"", "User input concatenated into SQL query — use parameterized queries"),
            ("execute(", "f'", "User input concatenated into SQL query — use parameterized queries"),
            ("cursor.execute", "format(", "String formatting in SQL query is vulnerable to injection"),
            ("execute(", "% ", "String interpolation in SQL query — use parameterized queries"),
        ],
        "Hardcoded Secrets": [],
    }

    for path, content in files.items():
        lines = content.split("\n")
        for i, line in enumerate(lines):
            lower = line.lower().strip()

            # Hardcoded secrets
            for keyword in ["api_key", "apikey", "secret", "password", "token", "private_key"]:
                if keyword in lower and ("=" in line or ":" in line) and not line.strip().startswith("#"):
                    # Check if it has a real value (not a variable reference or empty)
                    if any(c in line for c in ['"', "'"]):
                        issues.append({
                            "type": "security",
                            "severity": "high",
                            "file": path,
                            "message": f"Potential hardcoded secret on line {i+1}: {keyword.upper()} found with literal value assignment."
                        })
                        score -= 10

            # SQL injection
            if "execute(" in line and any(x in line for x in ['f"', "f'", "format(", "%s" if "%" in line else "@@NONE@@"]):
                issues.append({
                    "type": "security",
                    "severity": "high",
                    "file": path,
                    "message": f"Possible SQL injection on line {i+1}: User input may be concatenated into SQL query."
                })
                score -= 15

            # Eval / exec
            if "eval(" in lower or "exec(" in lower:
                issues.append({
                    "type": "security",
                    "severity": "high",
                    "file": path,
                    "message": f"Dangerous function eval()/exec() on line {i+1}: Allows arbitrary code execution."
                })
                score -= 15

            # Debug mode
            if "debug=true" in lower or "debug = true" in lower:
                issues.append({
                    "type": "security",
                    "severity": "medium",
                    "file": path,
                    "message": f"Debug mode enabled on line {i+1}: Should be disabled in production."
                })
                score -= 5

    return {"score": max(0, score), "issues": issues}


# ─── QUALITY AGENT ───────────────────────────────────────────────────

QUALITY_SYSTEM_PROMPT = """You are a senior software quality engineer specializing in code review and static analysis.
Analyze the provided codebase for quality issues.

Look for:
1. **High cyclomatic complexity**: Functions with many branches/paths
2. **Code smells**: Long functions (>50 lines), God classes, duplicate code
3. **Poor naming**: Unclear variable/function/class names
4. **Missing error handling**: Bare except blocks, unhandled edge cases
5. **Dead code**: Unused imports, unreachable code, commented-out blocks
6. **Anti-patterns**: Global state, deep nesting (>4 levels), magic numbers

Return ONLY valid JSON in this exact format:
{
  "score": <integer 0-100, where 100 is perfect quality>,
  "issues": [
    {
      "type": "quality",
      "severity": "high" | "medium" | "low",
      "file": "<filename>",
      "message": "<concise description of the quality issue>"
    }
  ]
}"""


async def quality_agent(files: dict[str, str]) -> dict:
    """Run the Quality agent on the codebase."""
    client = _get_client()
    code_block = _format_code_for_prompt(files)

    if client:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": QUALITY_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Analyze the following codebase for quality issues:\n\n{code_block}"},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            for issue in result.get("issues", []):
                issue["type"] = "quality"
            return result
        except Exception as e:
            print(f"Quality agent LLM error: {e}")

    return _fallback_quality_scan(files)


def _fallback_quality_scan(files: dict[str, str]) -> dict:
    """Simple rule-based quality scan as fallback."""
    issues = []
    score = 100

    for path, content in files.items():
        lines = content.split("\n")

        # Check function length
        func_start = None
        func_name = ""
        indent_level = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            # Detect function starts (Python/JS)
            if stripped.startswith("def ") or stripped.startswith("function ") or stripped.startswith("async function "):
                if func_start is not None:
                    length = i - func_start
                    if length > 100:
                        issues.append({
                            "type": "quality",
                            "severity": "high",
                            "file": path,
                            "message": f"Function '{func_name}' is {length} lines long. Refactor into smaller functions (aim for <50 lines)."
                        })
                        score -= 15
                    elif length > 50:
                        issues.append({
                            "type": "quality",
                            "severity": "medium",
                            "file": path,
                            "message": f"Function '{func_name}' is {length} lines long. Consider splitting into smaller functions."
                        })
                        score -= 5
                func_start = i
                func_name = stripped.split("(")[0].replace("def ", "").replace("function ", "").replace("async ", "").strip()

            # Deep nesting detection
            leading_spaces = len(line) - len(line.lstrip()) if line.strip() else 0
            if leading_spaces >= 24:  # ~6 levels of indent
                issues.append({
                    "type": "quality",
                    "severity": "medium",
                    "file": path,
                    "message": f"Deep nesting detected on line {i+1} (6+ levels). Consider early returns or extracting helper functions."
                })
                score -= 3

        # Check for bare except
        if "except:" in content and "except Exception" not in content:
            issues.append({
                "type": "quality",
                "severity": "medium",
                "file": path,
                "message": "Bare 'except:' clause catches all exceptions including SystemExit. Use specific exception types."
            })
            score -= 5

        # Long file
        if len(lines) > 500:
            issues.append({
                "type": "quality",
                "severity": "low",
                "file": path,
                "message": f"File is {len(lines)} lines long. Consider splitting into multiple modules."
            })
            score -= 3

    return {"score": max(0, score), "issues": issues}


# ─── DOCS AGENT ──────────────────────────────────────────────────────

DOCS_SYSTEM_PROMPT = """You are a technical writing specialist and documentation quality analyst.
Analyze the provided codebase for documentation quality.

Evaluate:
1. **README quality**: Does it have installation, usage, API docs, contributing, license sections?
2. **Inline comments**: Are complex logic sections documented? Are there docstrings?
3. **API documentation**: Are endpoints and functions documented with parameters and return types?
4. **Code examples**: Are there usage examples in docs?
5. **Changelog**: Is there a CHANGELOG or version history?

Return ONLY valid JSON in this exact format:
{
  "score": <integer 0-100, where 100 is perfectly documented>,
  "issues": [
    {
      "type": "documentation",
      "severity": "high" | "medium" | "low",
      "file": "<filename>",
      "message": "<concise description of the documentation issue>"
    }
  ]
}"""


async def docs_agent(files: dict[str, str]) -> dict:
    """Run the Documentation agent on the codebase."""
    client = _get_client()
    code_block = _format_code_for_prompt(files)

    if client:
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": DOCS_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Analyze the following codebase for documentation quality:\n\n{code_block}"},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )
            result = json.loads(response.choices[0].message.content)
            for issue in result.get("issues", []):
                issue["type"] = "documentation"
            return result
        except Exception as e:
            print(f"Docs agent LLM error: {e}")

    return _fallback_docs_scan(files)


def _fallback_docs_scan(files: dict[str, str]) -> dict:
    """Simple rule-based docs scan as fallback."""
    issues = []
    score = 100

    # Check README
    readme_files = {k: v for k, v in files.items() if "readme" in k.lower()}
    if not readme_files:
        issues.append({
            "type": "documentation",
            "severity": "high",
            "file": "N/A",
            "message": "No README file found. Every project needs a README with installation, usage, and contribution instructions."
        })
        score -= 25
    else:
        for path, content in readme_files.items():
            lines = [l for l in content.strip().split("\n") if l.strip()]
            if len(lines) < 10:
                issues.append({
                    "type": "documentation",
                    "severity": "medium",
                    "file": path,
                    "message": f"README is only {len(lines)} lines. Add sections: Overview, Installation, Usage, API Reference, Contributing, License."
                })
                score -= 15

            required_sections = ["install", "usage", "contribut", "license"]
            lower_content = content.lower()
            for section in required_sections:
                if section not in lower_content:
                    issues.append({
                        "type": "documentation",
                        "severity": "low",
                        "file": path,
                        "message": f"README missing '{section}' section."
                    })
                    score -= 5

    # Check docstrings in Python files
    for path, content in files.items():
        if path.endswith(".py"):
            lines = content.split("\n")
            functions_without_docs = 0
            total_functions = 0
            for i, line in enumerate(lines):
                if line.strip().startswith("def ") or line.strip().startswith("async def "):
                    total_functions += 1
                    # Check if next non-empty line is a docstring
                    has_docstring = False
                    for j in range(i + 1, min(i + 3, len(lines))):
                        if '"""' in lines[j] or "'''" in lines[j]:
                            has_docstring = True
                            break
                    if not has_docstring:
                        functions_without_docs += 1

            if total_functions > 0 and functions_without_docs > 0:
                pct = int((functions_without_docs / total_functions) * 100)
                severity = "high" if pct > 70 else "medium" if pct > 40 else "low"
                issues.append({
                    "type": "documentation",
                    "severity": severity,
                    "file": path,
                    "message": f"{functions_without_docs}/{total_functions} functions ({pct}%) missing docstrings."
                })
                score -= min(15, pct // 5)

        # Check JS/TS files for JSDoc
        if path.endswith((".js", ".ts", ".jsx", ".tsx")):
            if "/**" not in content and content.count("function") > 2:
                issues.append({
                    "type": "documentation",
                    "severity": "low",
                    "file": path,
                    "message": "No JSDoc comments found. Add documentation for exported functions and components."
                })
                score -= 5

    return {"score": max(0, score), "issues": issues}


# ─── MERGE & SCORE ───────────────────────────────────────────────────

def merge_agent_results(
    security_result: dict,
    quality_result: dict,
    docs_result: dict,
) -> dict:
    """
    Merge results from all three agents.
    Weighted score: Security 40%, Quality 35%, Docs 25%.
    """
    sec_score = security_result.get("score", 50)
    qual_score = quality_result.get("score", 50)
    docs_score = docs_result.get("score", 50)

    weighted_score = int(sec_score * 0.40 + qual_score * 0.35 + docs_score * 0.25)

    all_issues = (
        security_result.get("issues", [])
        + quality_result.get("issues", [])
        + docs_result.get("issues", [])
    )

    # Sort: high severity first, then medium, then low
    severity_order = {"high": 0, "medium": 1, "low": 2}
    all_issues.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 3))

    # Generate recommendations based on issues
    recommendations = _generate_recommendations(all_issues, sec_score, qual_score, docs_score)

    return {
        "overall_score": weighted_score,
        "security_score": sec_score,
        "quality_score": qual_score,
        "docs_score": docs_score,
        "issues": all_issues,
        "recommendations": recommendations,
    }


def _generate_recommendations(issues: list[dict], sec_score: int, qual_score: int, docs_score: int) -> list[str]:
    """Generate actionable recommendations based on the issues found."""
    recs = []

    # Security recommendations
    has_secrets = any("secret" in i.get("message", "").lower() or "hardcoded" in i.get("message", "").lower() or "password" in i.get("message", "").lower() for i in issues if i.get("type") == "security")
    has_injection = any("injection" in i.get("message", "").lower() for i in issues if i.get("type") == "security")

    if has_secrets:
        recs.append("Immediately rotate all exposed secrets. Use environment variables or a secrets manager (e.g., HashiCorp Vault, AWS Secrets Manager).")
    if has_injection:
        recs.append("Replace all raw query string concatenation with parameterized queries or an ORM to prevent injection attacks.")
    if sec_score < 60:
        recs.append("Set up automated security scanning (e.g., Bandit for Python, npm audit for JS) in your CI/CD pipeline.")

    # Quality recommendations
    has_long_funcs = any("lines long" in i.get("message", "").lower() for i in issues if i.get("type") == "quality")
    if has_long_funcs:
        recs.append("Break down long functions into smaller, single-responsibility functions (aim for under 40 lines each).")
    if qual_score < 60:
        recs.append("Add linting (ESLint/Pylint) and formatting (Prettier/Black) to enforce consistent code quality.")

    # Docs recommendations
    has_readme_issue = any("readme" in i.get("message", "").lower() for i in issues if i.get("type") == "documentation")
    if has_readme_issue:
        recs.append("Expand README.md with sections: Overview, Installation, Usage, API Reference, Contributing, and License.")
    if docs_score < 60:
        recs.append("Add docstrings to all public functions and JSDoc comments to exported components.")

    # General
    if not recs:
        recs.append("Codebase looks healthy! Consider adding automated testing and CI/CD pipelines for continuous quality assurance.")

    return recs
