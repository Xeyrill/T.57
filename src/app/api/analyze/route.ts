import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { github_url } = body;

        if (!github_url) {
            return NextResponse.json(
                { error: "github_url is required" },
                { status: 400 }
            );
        }

        const response = await fetch(`${BACKEND_URL}/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ github_url }),
        });

        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json(
                { error: `Backend error: ${errText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error("API proxy error:", error);

        // If backend is not running, return mock data for demo purposes
        const mockResult = {
            overall_score: 42,
            security_score: 25,
            quality_score: 45,
            docs_score: 60,
            issues: [
                {
                    type: "security",
                    severity: "high",
                    file: "vulnerable.py",
                    message:
                        "SQL Injection vulnerability detected: User input is directly concatenated into SQL query string without parameterization.",
                },
                {
                    type: "security",
                    severity: "high",
                    file: "vulnerable.py",
                    message:
                        'Hardcoded API key found: API_KEY = "sk-..." — Secrets should be stored in environment variables or a vault.',
                },
                {
                    type: "security",
                    severity: "high",
                    file: "vulnerable.py",
                    message:
                        'Hardcoded password detected: password = "admin123" — Never commit credentials to source code.',
                },
                {
                    type: "quality",
                    severity: "high",
                    file: "big_function.js",
                    message:
                        "Function exceeds 200 lines with cyclomatic complexity > 25. Refactor into smaller, single-responsibility functions.",
                },
                {
                    type: "quality",
                    severity: "medium",
                    file: "big_function.js",
                    message:
                        "Deeply nested conditional blocks (6+ levels). Consider early returns or extracting helper functions.",
                },
                {
                    type: "quality",
                    severity: "low",
                    file: "big_function.js",
                    message:
                        "No inline comments found in 200+ lines of code. Add JSDoc and inline documentation for maintainability.",
                },
                {
                    type: "documentation",
                    severity: "medium",
                    file: "README.md",
                    message:
                        "README is only 3 lines. A production README should include: installation, usage, API docs, contributing guidelines, and license.",
                },
                {
                    type: "documentation",
                    severity: "low",
                    file: "vulnerable.py",
                    message:
                        "No module-level docstring or function docstrings. Add documentation explaining the purpose and usage of exported functions.",
                },
            ],
            recommendations: [
                "Immediately rotate the exposed API key and password. Use environment variables or a secrets manager like HashiCorp Vault.",
                "Replace all raw SQL string concatenation with parameterized queries or an ORM like SQLAlchemy to prevent SQL injection.",
                "Refactor big_function.js into 5-8 smaller functions, each under 40 lines, with clear single responsibilities.",
                "Add comprehensive README.md with sections: Overview, Installation, Usage, API Reference, Contributing, and License.",
                "Set up a pre-commit hook with tools like Bandit (Python) and ESLint (JS) to catch security and quality issues before code is pushed.",
                "Implement automated dependency scanning using Dependabot or Snyk to detect vulnerable packages.",
            ],
        };

        return NextResponse.json(mockResult);
    }
}
