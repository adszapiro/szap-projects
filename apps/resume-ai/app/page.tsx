"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface SectionScore {
  score: number;
  feedback: string;
}

interface SectionScores {
  experience: SectionScore;
  skills: SectionScore;
  education: SectionScore;
  overall: SectionScore;
}

interface Suggestion {
  type: "improvement" | "addition" | "warning";
  section: string;
  original?: string;
  suggestion: string;
  reason: string;
}

interface AnalysisResult {
  score: number;
  sectionScores: SectionScores;
  suggestions: Suggestion[];
  keywords: {
    found: string[];
    missing: string[];
  };
  summary: string;
  meta?: {
    processingTimeMs: number;
    timestamp: string;
  };
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: string;
  retryable: boolean;
}

const TIMEOUT_SECONDS = 30;
const MAX_CHAR_LIMIT = 50000;
const CHAR_WARNING_THRESHOLD = 0.8;

const SAMPLE_RESUME = `ALEX SZAPIRO
Software Developer | Ann Arbor, MI

EXPERIENCE
Software Engineering Intern - TechCorp (Summer 2025)
• Built React applications with TypeScript for internal dashboard
• Implemented REST APIs using Node.js and Express
• Collaborated with senior engineers on code reviews

EDUCATION
University of Michigan - Economics (2028)
Minor in Computer Science
GPA: 3.7/4.0

SKILLS
JavaScript, TypeScript, React, Node.js, Python, SQL, Git

PROJECTS
• Portfolio Website - Next.js personal site with 3D graphics
• Trading Bot - Automated paper trading with Alpaca API`;

const SAMPLE_JOB = `Software Engineer Intern - Summer 2026

About the Role:
Join our team to build scalable web applications. You'll work with React, TypeScript, and cloud services.

Requirements:
• Pursuing a degree in Computer Science or related field
• Experience with React and TypeScript
• Familiarity with RESTful APIs
• Strong problem-solving skills
• Experience with version control (Git)

Nice to Have:
• Experience with cloud platforms (AWS, GCP)
• Open source contributions
• Knowledge of CI/CD pipelines`;

// Helper components
function SkeletonLoader() {
  return (
    <div className="space-y-8">
      {/* Score skeleton */}
      <div className="flex items-center gap-8 p-8 border border-gray-200 rounded-lg">
        <div className="skeleton w-24 h-24 rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className="skeleton skeleton-text w-32 h-6 mb-2" />
          <div className="skeleton skeleton-text w-full h-4" />
          <div className="skeleton skeleton-text w-3/4 h-4" />
        </div>
      </div>

      {/* Section scores skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 border border-gray-200 rounded-lg">
            <div className="skeleton skeleton-text w-20 h-3 mb-2" />
            <div className="skeleton w-full h-2 rounded mb-2" />
            <div className="skeleton skeleton-text w-24 h-3" />
          </div>
        ))}
      </div>

      {/* Keywords skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="p-6 border border-gray-200 rounded-lg">
            <div className="skeleton skeleton-text w-32 h-4 mb-4" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="skeleton w-16 h-6 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions skeleton */}
      <div>
        <div className="skeleton skeleton-text w-28 h-4 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton w-full h-24 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniProgressBar({ score, label, feedback }: { score: number; label: string; feedback: string }) {
  const getColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    if (s >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{score}</span>
      </div>
      <div className="mini-progress-track mb-2">
        <div
          className={`mini-progress-fill ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">{feedback}</p>
    </div>
  );
}

function CharacterCounter({ current, max }: { current: number; max: number }) {
  const percentage = current / max;
  const isWarning = percentage >= CHAR_WARNING_THRESHOLD && percentage < 1;
  const isDanger = percentage >= 1;

  return (
    <span
      className={`char-counter ${isWarning ? "warning" : ""} ${isDanger ? "danger" : ""}`}
    >
      {current.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

function TimeoutCountdown({ seconds, isActive }: { seconds: number; isActive: boolean }) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-2 text-gray-500">
      <div className="relative w-5 h-5">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="#e5e5e5"
            strokeWidth="2"
          />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
            strokeDasharray="50.3"
            className="countdown-ring"
            style={{ animationDuration: `${TIMEOUT_SECONDS}s` }}
          />
        </svg>
      </div>
      <span className="text-xs">{seconds}s remaining</span>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
        copied
          ? "bg-green-100 text-green-700 copy-success"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label || "Copy"}
        </>
      )}
    </button>
  );
}

function GradientProgressRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getGradientId = (s: number) => {
    if (s >= 80) return "gradient-excellent";
    if (s >= 60) return "gradient-good";
    if (s >= 40) return "gradient-moderate";
    return "gradient-poor";
  };

  return (
    <div className="relative w-28 h-28 flex-shrink-0">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
        <defs>
          <linearGradient id="gradient-excellent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="gradient-good" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="gradient-moderate" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="gradient-poor" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e5e5" strokeWidth="6" />
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke={`url(#${getGradientId(score)})`}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="progress-ring-animated"
          style={{ strokeDashoffset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-800">{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

function formatSuggestionsAsChecklist(suggestions: Suggestion[]): string {
  const lines = suggestions.map((s, i) => {
    const typeEmoji = s.type === "improvement" ? "🔧" : s.type === "addition" ? "➕" : "⚠️";
    return `${typeEmoji} [${s.section}] ${s.suggestion}\n   → ${s.reason}`;
  });
  return lines.join("\n\n");
}

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<ErrorResponse | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [countdown, setCountdown] = useState(TIMEOUT_SECONDS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer for loading state
  useEffect(() => {
    if (isAnalyzing) {
      setCountdown(TIMEOUT_SECONDS);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, [isAnalyzing]);

  const handlePdfUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError({ error: "Please upload a PDF file.", code: "INVALID_TYPE", retryable: false });
      return;
    }

    setIsPdfLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        fullText += pageText + "\n";
      }

      setResumeText(fullText.trim());
    } catch {
      setError({ error: "Failed to parse PDF. Please try pasting the text manually.", code: "PARSE_ERROR", retryable: false });
    } finally {
      setIsPdfLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  const loadSampleData = useCallback(() => {
    setResumeText(SAMPLE_RESUME);
    setJobDescription(SAMPLE_JOB);
    setError(null);
    setResult(null);
  }, []);

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setError({ 
        error: "Please provide both your resume and the job description.", 
        code: "MISSING_INPUTS",
        retryable: false 
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data as ErrorResponse);
        return;
      }

      setResult(data);
    } catch (err) {
      setError({ 
        error: "Network error. Please check your connection and try again.", 
        code: "UNKNOWN",
        retryable: true 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black">ResumeAI</h1>
            <p className="text-sm text-gray-500">AI-powered resume optimization</p>
          </div>
          <a
            href="https://alexszapiro.com"
            className="text-sm text-gray-400 hover:text-black transition-colors"
          >
            ← Portfolio
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Resume */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Your Resume
              </label>
              <div className="flex items-center gap-3">
                <CharacterCounter current={resumeText.length} max={MAX_CHAR_LIMIT} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className={`text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                    isPdfLoading
                      ? "bg-gray-100 text-gray-400"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {isPdfLoading ? "Parsing..." : "Upload PDF"}
                </label>
              </div>
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here..."
              className={`w-full h-64 p-4 border rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-black focus:outline-none resize-none transition-colors ${
                resumeText.length > MAX_CHAR_LIMIT ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
              maxLength={MAX_CHAR_LIMIT}
            />
          </div>

          {/* Job Description */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
                Job Description
              </label>
              <CharacterCounter current={jobDescription.length} max={MAX_CHAR_LIMIT} />
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className={`w-full h-64 p-4 border rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-black focus:outline-none resize-none transition-colors ${
                jobDescription.length > MAX_CHAR_LIMIT ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
              maxLength={MAX_CHAR_LIMIT}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={loadSampleData}
              disabled={isAnalyzing}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Load Sample
            </button>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !resumeText.trim() || !jobDescription.trim() || resumeText.length > MAX_CHAR_LIMIT || jobDescription.length > MAX_CHAR_LIMIT}
              className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                "Analyze Resume"
              )}
            </button>
          </div>
          <TimeoutCountdown seconds={countdown} isActive={isAnalyzing} />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-medium text-red-700">{error.error}</p>
                </div>
                {error.details && (
                  <p className="text-xs text-red-500 ml-6">{error.details}</p>
                )}
              </div>
              {error.retryable && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Skeleton Loading */}
        {isAnalyzing && <SkeletonLoader />}

        {/* Results */}
        {result && !isAnalyzing && (
          <div className="space-y-8">
            {/* Score */}
            <div className="flex items-center gap-8 p-8 border border-gray-200 rounded-lg fade-in">
              <GradientProgressRing score={result.score} />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-black mb-1">Match Score</h2>
                <p className="text-gray-500 text-sm">{result.summary}</p>
                {result.meta && (
                  <p className="text-xs text-gray-400 mt-2">
                    Analyzed in {(result.meta.processingTimeMs / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
            </div>

            {/* Section Scores */}
            {result.sectionScores && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 fade-in-delay-1">
                <MiniProgressBar
                  score={result.sectionScores.experience.score}
                  label="Experience"
                  feedback={result.sectionScores.experience.feedback}
                />
                <MiniProgressBar
                  score={result.sectionScores.skills.score}
                  label="Skills"
                  feedback={result.sectionScores.skills.feedback}
                />
                <MiniProgressBar
                  score={result.sectionScores.education.score}
                  label="Education"
                  feedback={result.sectionScores.education.feedback}
                />
                <MiniProgressBar
                  score={result.sectionScores.overall.score}
                  label="Overall"
                  feedback={result.sectionScores.overall.feedback}
                />
              </div>
            )}

            {/* Keywords */}
            <div className="grid md:grid-cols-2 gap-6 fade-in-delay-2">
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xs font-medium uppercase tracking-wider text-green-600 mb-4">
                  Keywords Found ({result.keywords.found.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.found.length > 0 ? (
                    result.keywords.found.map((kw, i) => (
                      <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No matching keywords found</span>
                  )}
                </div>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xs font-medium uppercase tracking-wider text-amber-600 mb-4">
                  Missing Keywords ({result.keywords.missing.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.missing.length > 0 ? (
                    result.keywords.missing.map((kw, i) => (
                      <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 text-sm rounded-full">
                        {kw}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">All important keywords present!</span>
                  )}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="fade-in-delay-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Suggestions ({result.suggestions.length})
                </h3>
                {result.suggestions.length > 0 && (
                  <CopyButton
                    text={formatSuggestionsAsChecklist(result.suggestions)}
                    label="Copy All"
                  />
                )}
              </div>
              <div className="space-y-3">
                {result.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border ${
                      s.type === "improvement"
                        ? "bg-blue-50 border-blue-200"
                        : s.type === "addition"
                        ? "bg-green-50 border-green-200"
                        : "bg-amber-50 border-amber-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {s.type === "improvement" ? "🔧" : s.type === "addition" ? "➕" : "⚠️"}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            s.type === "improvement"
                              ? "bg-blue-100 text-blue-700"
                              : s.type === "addition"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {s.type}
                        </span>
                        <span className="text-xs text-gray-500">{s.section}</span>
                      </div>
                      <CopyButton text={`${s.suggestion}\n\nReason: ${s.reason}`} />
                    </div>
                    <p className="text-sm text-gray-800 font-medium">{s.suggestion}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {!result && !isAnalyzing && (
          <div className="grid md:grid-cols-3 gap-6 mt-16 fade-in">
            {[
              { icon: "🤖", title: "AI Analysis", desc: "GPT-4 powered resume analysis with section-by-section scoring" },
              { icon: "🔍", title: "Keyword Matching", desc: "See which keywords you have and what's missing" },
              { icon: "✨", title: "Actionable Tips", desc: "Specific, prioritized suggestions to improve your match" },
            ].map((f, i) => (
              <div key={i} className="p-6 border border-gray-200 rounded-lg text-center hover:border-gray-300 transition-colors">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="font-medium text-black mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-gray-400">
          Built by Alex Szapiro
        </div>
      </footer>
    </div>
  );
}
