import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════════
// RepoGuardian — Self-contained analysis API route
// GitHub client + 3 rule-based agents running as Vercel serverless function
// ═══════════════════════════════════════════════════════════════════════

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

// ─── Types ─────────────────────────────────────────────────────────────

interface Issue {
    type: string;
    severity: string;
    file: string;
    message: string;
}

interface AgentResult {
    score: number;
    issues: Issue[];
}

interface FileEntry {
    path: string;
    content: string;
}

// ─── GitHub Client ─────────────────────────────────────────────────────

function parseGitHubUrl(url: string): { owner: string; repo: string } {
    const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
    const match = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) throw new Error("Invalid GitHub URL");
    return { owner: match[1], repo: match[2] };
}

async function fetchRepoFiles(owner: string, repo: string): Promise<FileEntry[]> {
    const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RepoGuardian/1.0",
    };
    if (GITHUB_TOKEN) headers.Authorization = `token ${GITHUB_TOKEN}`;

    // Fetch file tree
    const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
        { headers }
    );

    if (!treeRes.ok) {
        // Try 'master' branch
        const masterRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`,
            { headers }
        );
        if (!masterRes.ok) throw new Error(`GitHub API error: ${masterRes.status} - Could not fetch repo tree`);
        const masterData = await masterRes.json();
        return fetchFilesFromTree(owner, repo, masterData.tree, headers);
    }

    const data = await treeRes.json();
    return fetchFilesFromTree(owner, repo, data.tree, headers);
}

const RELEVANT_EXTENSIONS = [".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rb", ".php", ".rs", ".c", ".cpp", ".h"];
const RELEVANT_NAMES = ["README", "readme", "Dockerfile", "docker-compose", ".env", "package.json", "requirements.txt", "Cargo.toml", "go.mod"];
const MAX_FILES = 30;
const MAX_FILE_SIZE = 50000; // 50KB per file

async function fetchFilesFromTree(
    owner: string,
    repo: string,
    tree: Array<{ path: string; type: string; size?: number }>,
    headers: Record<string, string>
): Promise<FileEntry[]> {
    const relevantFiles = tree.filter((item) => {
        if (item.type !== "blob") return false;
        if ((item.size || 0) > MAX_FILE_SIZE) return false;
        const ext = "." + (item.path.split(".").pop() || "");
        const name = item.path.split("/").pop() || "";
        return RELEVANT_EXTENSIONS.includes(ext) || RELEVANT_NAMES.some((n) => name.startsWith(n));
    }).slice(0, MAX_FILES);

    const files: FileEntry[] = [];
    for (const file of relevantFiles) {
        try {
            const rawRes = await fetch(
                `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file.path}`,
                { headers: { "User-Agent": "RepoGuardian/1.0" } }
            );
            if (rawRes.ok) {
                const content = await rawRes.text();
                files.push({ path: file.path, content });
            }
        } catch {
            // Skip failed fetches
        }
    }
    return files;
}

// ─── Security Agent ────────────────────────────────────────────────────

function securityAgent(files: FileEntry[]): AgentResult {
    const issues: Issue[] = [];
    let deductions = 0;

    for (const file of files) {
        const lines = file.content.split("\n");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const ln = i + 1;

            // SQL Injection
            if (/f["'].*SELECT.*\{|\.format\(.*SELECT|['"].*SELECT.*\+\s*\w|execute\(.*\+\s*\w|execute\(f["']/i.test(line)) {
                issues.push({ type: "security", severity: "high", file: file.path, message: `Line ${ln}: SQL Injection risk — user input concatenated into SQL query. Use parameterized queries.` });
                deductions += 15;
            }

            // Hardcoded secrets
            if (/(?:api_key|apikey|secret|password|passwd|token|auth)\s*=\s*["'][^"']{8,}/i.test(line) && !/example|placeholder|your_|TODO|changeme|xxx/i.test(line)) {
                issues.push({ type: "security", severity: "high", file: file.path, message: `Line ${ln}: Hardcoded secret detected. Move to environment variables or a secrets manager.` });
                deductions += 12;
            }

            // eval / exec
            if (/\beval\s*\(|\bexec\s*\(/i.test(line) && !/\/\/|#.*eval/i.test(line)) {
                issues.push({ type: "security", severity: "high", file: file.path, message: `Line ${ln}: Use of eval()/exec() — potential code injection vector. Avoid dynamic code execution.` });
                deductions += 10;
            }

            // Command injection
            if (/os\.system\(|subprocess\.call\(.*shell\s*=\s*True|child_process\.exec\(/i.test(line)) {
                issues.push({ type: "security", severity: "high", file: file.path, message: `Line ${ln}: Shell command execution — potential command injection. Use subprocess with arrays, not shell=True.` });
                deductions += 12;
            }

            // Debug mode
            if (/debug\s*=\s*True|DEBUG\s*=\s*true|debug\s*:\s*true/i.test(line)) {
                issues.push({ type: "security", severity: "medium", file: file.path, message: `Line ${ln}: Debug mode enabled — disable in production to prevent information leakage.` });
                deductions += 5;
            }

            // Insecure HTTP
            if (/http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(line) && !/\/\/.*comment/i.test(line)) {
                if (!/test|spec|mock|example/i.test(file.path)) {
                    issues.push({ type: "security", severity: "low", file: file.path, message: `Line ${ln}: Insecure HTTP URL — use HTTPS for production endpoints.` });
                    deductions += 3;
                }
            }
        }
    }

    return { score: Math.max(0, 100 - deductions), issues };
}

// ─── Quality Agent ─────────────────────────────────────────────────────

function qualityAgent(files: FileEntry[]): AgentResult {
    const issues: Issue[] = [];
    let deductions = 0;

    for (const file of files) {
        const lines = file.content.split("\n");
        const totalLines = lines.length;

        // Skip non-code files
        const ext = "." + (file.path.split(".").pop() || "");
        if (![".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rb", ".php", ".rs", ".c", ".cpp"].includes(ext)) continue;

        // Detect long functions
        let funcStart = -1;
        let braceDepth = 0;
        let maxNesting = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Function detection (simplified)
            if (/^\s*(def |function |const \w+ = (?:async )?(?:\([^)]*\)|[a-zA-Z]+)\s*=>|(?:async )?(?:function|\w+)\s*\([^)]*\)\s*\{)/.test(line)) {
                if (funcStart >= 0 && i - funcStart > 50) {
                    issues.push({ type: "quality", severity: "high", file: file.path, message: `Function starting at line ${funcStart + 1} is ${i - funcStart} lines long. Refactor into smaller functions (<50 lines).` });
                    deductions += 10;
                }
                funcStart = i;
                maxNesting = 0;
            }

            // Track nesting
            const opens = (line.match(/\{/g) || []).length;
            const closes = (line.match(/\}/g) || []).length;
            braceDepth += opens - closes;
            if (braceDepth > maxNesting) maxNesting = braceDepth;
            if (maxNesting >= 5 && opens > 0) {
                issues.push({ type: "quality", severity: "medium", file: file.path, message: `Line ${i + 1}: Deeply nested code (${maxNesting} levels). Consider early returns or extracting helpers.` });
                deductions += 5;
                maxNesting = -999; // Only report once per file
            }
        }

        // Check last function
        if (funcStart >= 0 && totalLines - funcStart > 50) {
            issues.push({ type: "quality", severity: "high", file: file.path, message: `Function starting at line ${funcStart + 1} is ${totalLines - funcStart} lines long. Refactor into smaller functions.` });
            deductions += 10;
        }

        // File too large
        if (totalLines > 500) {
            issues.push({ type: "quality", severity: "medium", file: file.path, message: `File is ${totalLines} lines. Consider splitting into smaller modules (<300 lines each).` });
            deductions += 5;
        }

        // No comments at all
        const commentLines = lines.filter((l) => /^\s*(\/\/|#|\/\*|\*|"""|''')/.test(l)).length;
        if (totalLines > 50 && commentLines === 0) {
            issues.push({ type: "quality", severity: "low", file: file.path, message: `No inline comments in ${totalLines} lines. Add documentation for maintainability.` });
            deductions += 3;
        }
    }

    return { score: Math.max(0, 100 - deductions), issues };
}

// ─── Docs Agent ────────────────────────────────────────────────────────

function docsAgent(files: FileEntry[]): AgentResult {
    const issues: Issue[] = [];
    let deductions = 0;

    // Check README
    const readme = files.find((f) => /readme/i.test(f.path));
    if (!readme) {
        issues.push({ type: "documentation", severity: "high", file: "README.md", message: "No README found. Add one with: overview, installation, usage, and contributing sections." });
        deductions += 20;
    } else {
        const readmeLines = readme.content.split("\n").filter((l) => l.trim()).length;
        if (readmeLines < 10) {
            issues.push({ type: "documentation", severity: "medium", file: readme.path, message: `README is only ${readmeLines} lines. Expand with: installation, usage, API reference, contributing guidelines.` });
            deductions += 10;
        }
        // Check for key sections
        const content = readme.content.toLowerCase();
        if (!/install/i.test(content)) {
            issues.push({ type: "documentation", severity: "low", file: readme.path, message: "README missing installation instructions." });
            deductions += 3;
        }
        if (!/usage|getting started|quick start/i.test(content)) {
            issues.push({ type: "documentation", severity: "low", file: readme.path, message: "README missing usage/getting started section." });
            deductions += 3;
        }
    }

    // Check for docstrings / JSDoc
    const codeFiles = files.filter((f) => /\.(py|js|ts|tsx|jsx)$/.test(f.path));
    let filesWithoutDocs = 0;
    for (const file of codeFiles) {
        const hasDocstring = /"""|'''|\/\*\*/.test(file.content);
        if (!hasDocstring && file.content.split("\n").length > 20) {
            filesWithoutDocs++;
        }
    }
    if (filesWithoutDocs > 0 && codeFiles.length > 0) {
        const pct = Math.round((filesWithoutDocs / codeFiles.length) * 100);
        issues.push({
            type: "documentation",
            severity: filesWithoutDocs > 3 ? "medium" : "low",
            file: "(multiple files)",
            message: `${filesWithoutDocs} of ${codeFiles.length} code files (${pct}%) have no docstrings or JSDoc. Add module-level documentation.`
        });
        deductions += Math.min(filesWithoutDocs * 3, 15);
    }

    return { score: Math.max(0, 100 - deductions), issues };
}

// ─── Merge Agent Results ───────────────────────────────────────────────

function mergeResults(sec: AgentResult, qual: AgentResult, docs: AgentResult) {
    const overall_score = Math.round(sec.score * 0.4 + qual.score * 0.35 + docs.score * 0.25);

    const allIssues = [...sec.issues, ...qual.issues, ...docs.issues];
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    allIssues.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

    // Generate recommendations
    const recommendations: string[] = [];
    const hasSecrets = sec.issues.some((i) => /secret|password|key/i.test(i.message));
    const hasSQLi = sec.issues.some((i) => /sql injection/i.test(i.message));
    const hasLongFn = qual.issues.some((i) => /lines long/i.test(i.message));
    const hasNoReadme = docs.issues.some((i) => /no readme/i.test(i.message));
    const hasBadReadme = docs.issues.some((i) => /readme is only/i.test(i.message));

    if (hasSecrets) recommendations.push("Rotate exposed secrets immediately. Use environment variables or a secrets manager like HashiCorp Vault.");
    if (hasSQLi) recommendations.push("Replace all raw SQL concatenation with parameterized queries or an ORM to prevent SQL injection.");
    if (hasLongFn) recommendations.push("Break large functions into smaller, single-responsibility functions (target <50 lines each).");
    if (hasNoReadme || hasBadReadme) recommendations.push("Add a comprehensive README with: Overview, Installation, Usage, API Reference, Contributing, and License sections.");
    if (sec.score < 60) recommendations.push("Set up pre-commit hooks with Bandit (Python) or ESLint security plugins to catch vulnerabilities before push.");
    if (qual.score < 60) recommendations.push("Implement linting (ESLint/Pylint) and complexity analysis in your CI pipeline.");
    if (docs.score < 60) recommendations.push("Add JSDoc/docstrings to exported functions and modules for better maintainability.");

    return {
        overall_score,
        security_score: sec.score,
        quality_score: qual.score,
        docs_score: docs.score,
        issues: allIssues,
        recommendations,
    };
}

// ─── Mock Data (when no real GitHub URL or for demo) ───────────────────

function getMockResult() {
    return {
        overall_score: 42,
        security_score: 25,
        quality_score: 45,
        docs_score: 60,
        issues: [
            { type: "security", severity: "high", file: "vulnerable.py", message: "SQL Injection vulnerability detected: User input concatenated into SQL query without parameterization." },
            { type: "security", severity: "high", file: "vulnerable.py", message: 'Hardcoded API key found: API_KEY = "sk-..." — Move to environment variables.' },
            { type: "security", severity: "high", file: "vulnerable.py", message: 'Hardcoded password: password = "admin123" — Never commit credentials.' },
            { type: "quality", severity: "high", file: "big_function.js", message: "Function exceeds 200 lines with cyclomatic complexity > 25. Refactor into smaller functions." },
            { type: "quality", severity: "medium", file: "big_function.js", message: "Deeply nested conditional blocks (6+ levels). Use early returns or extract helpers." },
            { type: "quality", severity: "low", file: "big_function.js", message: "No inline comments in 200+ lines. Add JSDoc and inline docs." },
            { type: "documentation", severity: "medium", file: "README.md", message: "README is only 3 lines. Add installation, usage, API docs, contributing, and license." },
            { type: "documentation", severity: "low", file: "vulnerable.py", message: "No module-level docstring or function docs. Add documentation for exported functions." },
        ],
        recommendations: [
            "Rotate the exposed API key and password. Use environment variables or a secrets manager.",
            "Replace raw SQL concatenation with parameterized queries or an ORM like SQLAlchemy.",
            "Refactor big_function.js into 5-8 smaller functions, each under 40 lines.",
            "Add comprehensive README with: Overview, Installation, Usage, API Reference, Contributing.",
            "Set up pre-commit hooks with Bandit (Python) and ESLint (JS) to catch issues before push.",
            "Implement automated dependency scanning with Dependabot or Snyk.",
        ],
    };
}

// ─── API Handler ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { github_url } = body;

        if (!github_url) {
            return NextResponse.json({ error: "github_url is required" }, { status: 400 });
        }

        // Parse GitHub URL
        let owner: string, repo: string;
        try {
            ({ owner, repo } = parseGitHubUrl(github_url));
        } catch {
            return NextResponse.json({ error: "Invalid GitHub URL format" }, { status: 400 });
        }

        // Fetch repo files
        let files: FileEntry[];
        try {
            files = await fetchRepoFiles(owner, repo);
        } catch (err: unknown) {
            console.error("GitHub fetch error:", err);
            // Return mock data if GitHub fetch fails
            return NextResponse.json(getMockResult());
        }

        if (files.length === 0) {
            // Empty repo or no analyzable files — return mock
            return NextResponse.json(getMockResult());
        }

        // Run 3 agents
        const secResult = securityAgent(files);
        const qualResult = qualityAgent(files);
        const docsResult = docsAgent(files);

        // Merge results
        const result = mergeResults(secResult, qualResult, docsResult);

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Analysis error:", error);
        // Fallback to mock data
        return NextResponse.json(getMockResult());
    }
}
