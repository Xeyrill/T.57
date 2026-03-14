"use client";

import { useEffect, useState } from "react";

interface Issue {
    type: string;
    severity: string;
    file: string;
    message: string;
}

interface AnalysisResult {
    overall_score: number;
    security_score: number;
    quality_score: number;
    docs_score: number;
    issues: Issue[];
    recommendations: string[];
}

interface DashboardProps {
    result: AnalysisResult;
    repoUrl: string;
    onReset: () => void;
}

/* ─── Hand-drawn health ring (monotone) ─── */
function HealthRing({ score, label }: { score: number; label: string }) {
    const [offset, setOffset] = useState(283);
    const circumference = 283;
    const target = circumference - (score / 100) * circumference;

    const grade = score > 80 ? "CLEAN" : score >= 50 ? "FAIR" : "DIRTY";

    useEffect(() => {
        const timer = setTimeout(() => setOffset(target), 100);
        return () => clearTimeout(timer);
    }, [target]);

    return (
        <div className="flex flex-col items-center">
            <div className="relative">
                <svg width="140" height="140" viewBox="0 0 100 100" className="-rotate-90">
                    <defs>
                        <filter id={`roughen-${label}`}>
                            <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="4" result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
                        </filter>
                    </defs>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke={score > 80 ? "#D4D4D4" : score >= 50 ? "#999999" : "#E8E8E8"}
                        strokeWidth="4"
                        strokeLinecap="square"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        filter={`url(#roughen-${label})`}
                        style={{ transition: "stroke-dashoffset 1.5s ease-out" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="stencil-text text-3xl text-chalk">{score}</span>
                    <span className="severity-tag text-faded/60 mt-0.5 text-[8px]">{grade}</span>
                </div>
            </div>
            <p className="severity-tag text-faded/40 mt-2">{label}</p>
        </div>
    );
}

/* ─── Issue card with sticker-peel animation ─── */
function IssueCard({ issue, index }: { issue: Issue; index: number }) {
    const isHigh = issue.severity.toLowerCase() === "high";
    const isMedium = issue.severity.toLowerCase() === "medium";

    const rotations = [-1.5, 0.8, -0.5, 1.2, -0.8, 0.5, -1, 0.3];
    const rot = rotations[index % rotations.length];

    const borderAccent = isHigh
        ? "border-l-2 border-l-chalk"
        : isMedium
            ? "border-l-2 border-l-faded"
            : "border-l-2 border-l-faded/30";

    const severityStyle = isHigh
        ? "bg-chalk text-charcoal"
        : isMedium
            ? "bg-faded/20 text-faded"
            : "bg-faded/10 text-faded/60";

    const typeLabels: Record<string, string> = {
        security: "SEC",
        quality: "QUA",
        documentation: "DOC",
        docs: "DOC",
    };

    return (
        <div
            className={`sticker-panel ${borderAccent} p-5 animate-sticker-peel opacity-0 cursor-default`}
            style={{ animationDelay: `${index * 0.1}s`, transform: `rotate(${rot}deg)` }}
        >
            <div className="flex items-center justify-between mb-3">
                <span className="severity-tag text-faded/50">
                    {typeLabels[issue.type.toLowerCase()] || "---"}
                </span>
                <span className={`severity-tag px-2 py-0.5 ${severityStyle}`}>
                    {issue.severity.toUpperCase()}
                </span>
            </div>
            <p className="text-xs text-aged-paper/80 leading-relaxed mb-4 font-mono">{issue.message}</p>
            <div className="flex items-center gap-2 border-t border-faded/10 pt-3">
                <span className="text-faded/30 text-xs">→</span>
                <span className="text-[10px] text-faded/50 font-mono truncate">{issue.file}</span>
            </div>
        </div>
    );
}

/* ─── Main Dashboard ─── */
export default function Dashboard({ result, repoUrl, onReset }: DashboardProps) {
    const highCount = result.issues.filter((i) => i.severity.toLowerCase() === "high").length;
    const mediumCount = result.issues.filter((i) => i.severity.toLowerCase() === "medium").length;
    const lowCount = result.issues.filter((i) => i.severity.toLowerCase() === "low").length;

    return (
        <div className="mx-auto max-w-6xl px-6 py-8 animate-spray-reveal">
            {/* ─── Header ─── */}
            <div className="mb-10 flex items-start justify-between">
                <div>
                    <button
                        onClick={onReset}
                        className="mb-3 flex items-center gap-1 text-xs text-faded/40 hover:text-chalk font-mono transition-colors"
                    >
                        ← new scan
                    </button>
                    <h2 className="stencil-text text-3xl text-chalk tracking-[4px]">REPORT</h2>
                    <p className="mt-2 text-xs text-faded/40 font-mono">{repoUrl}</p>
                </div>
                <span className="severity-tag text-faded/40 animate-tag-flicker">● COMPLETE</span>
            </div>

            {/* ─── Per-Agent Score Rings ─── */}
            <div className="mb-10 grid grid-cols-1 md:grid-cols-4 gap-5">
                {/* Overall score (larger) */}
                <div className="sticker-panel flex flex-col items-center justify-center p-6">
                    <HealthRing score={result.overall_score} label="OVERALL" />
                </div>

                {/* Per-agent rings */}
                <div className="sticker-panel flex items-center justify-center p-6 animate-sticker-peel opacity-0" style={{ animationDelay: "0.1s" }}>
                    <HealthRing score={result.security_score} label="SECURITY" />
                </div>
                <div className="sticker-panel flex items-center justify-center p-6 animate-sticker-peel opacity-0" style={{ animationDelay: "0.2s" }}>
                    <HealthRing score={result.quality_score} label="QUALITY" />
                </div>
                <div className="sticker-panel flex items-center justify-center p-6 animate-sticker-peel opacity-0" style={{ animationDelay: "0.3s" }}>
                    <HealthRing score={result.docs_score} label="DOCS" />
                </div>
            </div>

            {/* ─── Severity Summary ─── */}
            <div className="mb-10 grid grid-cols-3 gap-4">
                {[
                    { label: "HIGH", count: highCount, note: "fix now" },
                    { label: "MEDIUM", count: mediumCount, note: "soon" },
                    { label: "LOW", count: lowCount, note: "minor" },
                ].map((stat, i) => (
                    <div
                        key={stat.label}
                        className="sticker-panel p-5 animate-sticker-peel opacity-0"
                        style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                    >
                        <p className="severity-tag text-faded/40 mb-2">{stat.label}</p>
                        <p className="stencil-text text-3xl text-chalk">{stat.count}</p>
                        <p className="handwritten text-[10px] mt-1">{stat.note}</p>
                    </div>
                ))}
            </div>

            {/* ─── Issues Grid ─── */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                    <h3 className="stencil-text text-lg text-chalk tracking-[3px]">ISSUES</h3>
                    <span className="text-xs text-faded/30 font-mono">({result.issues.length})</span>
                    <div className="flex-1 h-[1px] bg-faded/10" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.issues.map((issue, i) => (
                        <IssueCard key={i} issue={issue} index={i} />
                    ))}
                </div>
            </div>

            {/* ─── Recommendations — handwritten notes ─── */}
            {result.recommendations.length > 0 && (
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-5">
                        <h3 className="stencil-text text-lg text-chalk tracking-[3px]">NOTES</h3>
                        <div className="flex-1 h-[1px] bg-faded/10" />
                    </div>
                    <div className="space-y-3">
                        {result.recommendations.map((rec, i) => (
                            <div
                                key={i}
                                className="sticker-panel flex items-start gap-4 p-4 animate-fade-up opacity-0"
                                style={{ animationDelay: `${0.6 + i * 0.1}s` }}
                            >
                                <span className="stencil-text text-sm text-faded/30 shrink-0 w-6 text-right">
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <p className="text-xs text-aged-paper/70 leading-relaxed font-mono">{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─── Footer scribble ─── */}
            <div className="text-center pb-8">
                <span className="handwritten text-[10px] text-faded/20">
          // t.57 devops agent — end of report
                </span>
            </div>
        </div>
    );
}
