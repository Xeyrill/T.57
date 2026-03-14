"use client";

import { useState } from "react";
import Dashboard from "@/components/Dashboard";

interface Issue {
  type: string;
  severity: string;
  file: string;
  message: string;
}

interface AnalysisResult {
  score: number;
  issues: Issue[];
  recommendations: string[];
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: repoUrl.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Analysis failed (${res.status})`);
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-charcoal">
      {/* ─── Ambient wall texture ─── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-0 h-full w-full opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 20%, rgba(255,255,255,0.015) 0%, transparent 40%),
                              radial-gradient(circle at 85% 80%, rgba(255,255,255,0.01) 0%, transparent 30%)`,
          }}
        />
        {/* Subtle grid lines like brick */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 40px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* ─── Nav ─── */}
        <nav className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="stencil-text text-lg text-chalk tracking-[4px]">
              T.57
            </div>
            <span className="text-faded text-xs tracking-wider">// DEVOPS AGENT</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-faded font-mono tracking-wide animate-tag-flicker">
              ● LIVE
            </span>
            <span className="text-xs text-faded font-mono">
              3 AGENTS
            </span>
          </div>
        </nav>

        {/* ─── Hero Section ─── */}
        {!result && (
          <section className="flex flex-col items-center justify-center px-6 pt-16 pb-20">
            {/* Stencil badge */}
            <div className="mb-10 animate-spray-reveal">
              <span className="inline-block border border-dashed border-faded/30 px-4 py-1.5 text-[10px] font-mono uppercase tracking-[6px] text-faded">
                Multi-Agent Intelligence
              </span>
            </div>

            {/* Main heading — stencil graffiti style */}
            <div className="animate-glitch mb-2">
              <h1 className="stencil-text text-center text-6xl leading-none text-chalk md:text-8xl lg:text-9xl">
                ANALYZE
              </h1>
            </div>
            <h1 className="stencil-text mb-3 text-center text-6xl leading-none text-faded/40 md:text-8xl lg:text-9xl animate-spray-reveal">
              SECURE
            </h1>
            <h1 className="stencil-text text-center text-6xl leading-none text-chalk md:text-8xl lg:text-9xl animate-spray-reveal" style={{ animationDelay: '0.2s' }}>
              SHIP IT
            </h1>

            {/* Tagline */}
            <p className="handwritten mt-8 mb-12 max-w-lg text-center text-sm text-faded leading-relaxed">
              &quot;three agents scan your code for vulnerabilities, bad patterns,
              and missing documentation — so you can ship fearlessly.&quot;
            </p>

            {/* ─── Input: spray-stencil box ─── */}
            <div className="relative w-full max-w-xl animate-fade-up" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 rounded-none border-2 border-dashed border-stencil/20 bg-charcoal p-1.5 transition-all duration-300 focus-within:border-stencil/50">
                <span className="pl-3 text-faded/40 text-sm font-mono">→</span>
                <input
                  id="github-url-input"
                  type="url"
                  placeholder="paste github url here..."
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="stencil-input flex-1 border-none bg-transparent px-2 py-3 text-sm text-chalk placeholder-faded/30 outline-none"
                  disabled={loading}
                />
                <button
                  id="analyze-btn"
                  onClick={handleAnalyze}
                  disabled={loading || !repoUrl.trim()}
                  className="stencil-text shrink-0 bg-chalk px-5 py-3 text-xs tracking-[3px] text-charcoal transition-all duration-300 hover:bg-aged-paper hover:shadow-tag hover:-translate-y-0.5 hover:rotate-[-0.5deg] active:translate-y-0 active:rotate-0 disabled:opacity-20 disabled:hover:translate-y-0 disabled:hover:rotate-0 disabled:hover:shadow-none"
                >
                  {loading ? "SCANNING" : "ANALYZE"}
                </button>
              </div>
              {/* Rough underline drip */}
              <div className="mt-1 h-[2px] w-full bg-gradient-to-r from-faded/20 via-faded/5 to-transparent" />
            </div>

            {/* Feature tags — like stickers on a wall */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              {[
                { label: "SECURITY", delay: "0.5s", rot: "-1.5deg" },
                { label: "QUALITY", delay: "0.7s", rot: "1deg" },
                { label: "DOCS", delay: "0.9s", rot: "-0.5deg" },
              ].map((tag) => (
                <div
                  key={tag.label}
                  className="sticker-panel stencil-text px-5 py-2.5 text-[10px] tracking-[4px] text-faded animate-sticker-peel opacity-0"
                  style={{
                    animationDelay: tag.delay,
                    transform: `rotate(${tag.rot})`,
                  }}
                >
                  {tag.label}
                </div>
              ))}
            </div>

            {/* Bottom marker scribble */}
            <div className="mt-16 text-center">
              <span className="handwritten text-xs text-faded/30">
                // team 57 — built for hackathons
              </span>
            </div>
          </section>
        )}

        {/* ─── Loading Overlay: spray-paint reveal ─── */}
        {loading && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-charcoal/95">
            {/* Scanning animation */}
            <div className="relative mb-10">
              <div className="h-20 w-20 border-2 border-dashed border-stencil/30 animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="stencil-text text-2xl text-chalk animate-tag-flicker">⊘</span>
              </div>
            </div>

            <p className="stencil-text text-2xl tracking-[8px] text-chalk animate-spray-reveal">
              SCANNING
            </p>
            <div className="mt-4 flex gap-6 text-xs font-mono text-faded/50">
              <span className="animate-spray-reveal" style={{ animationDelay: '0.3s' }}>security</span>
              <span className="animate-spray-reveal" style={{ animationDelay: '0.6s' }}>quality</span>
              <span className="animate-spray-reveal" style={{ animationDelay: '0.9s' }}>documentation</span>
            </div>

            {/* Dot progress */}
            <div className="mt-8 flex gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-1 w-8 bg-faded/20 animate-spray-reveal"
                  style={{ animationDelay: `${1 + i * 0.4}s` }}
                >
                  <div className="h-full w-full bg-chalk animate-tag-flicker" style={{ animationDelay: `${i * 0.2}s` }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Error State ─── */}
        {error && !loading && (
          <div className="mx-auto mt-8 max-w-xl animate-spray-reveal px-6">
            <div className="sticker-panel border-l-2 border-l-warn-flash p-5">
              <div className="flex items-start gap-3">
                <span className="stencil-text text-sm text-warn-flash">ERR</span>
                <div>
                  <p className="text-sm text-faded font-mono">{error}</p>
                  <button
                    onClick={() => { setError(null); setResult(null); }}
                    className="mt-3 text-sm font-mono text-chalk/60 hover:text-chalk underline decoration-dashed underline-offset-4"
                  >
                    ← try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Results Dashboard ─── */}
        {result && !loading && (
          <Dashboard
            result={result}
            repoUrl={repoUrl}
            onReset={() => { setResult(null); setRepoUrl(""); }}
          />
        )}
      </div>
    </main>
  );
}
