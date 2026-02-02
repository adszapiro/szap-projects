"use client";

import { useState, useCallback, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Suggestion {
  type: "improvement" | "addition" | "warning";
  section: string;
  original?: string;
  suggestion: string;
  reason: string;
}

interface AnalysisResult {
  score: number;
  suggestions: Suggestion[];
  keywords: {
    found: string[];
    missing: string[];
  };
  summary: string;
}

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

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file.");
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
      setError("Failed to parse PDF. Please try pasting the text manually.");
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
      setError("Please provide both your resume and the job description.");
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
              <div>
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
              className="w-full h-64 p-4 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-black focus:outline-none resize-none"
            />
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
              Job Description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full h-64 p-4 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:border-black focus:outline-none resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <button
            onClick={loadSampleData}
            disabled={isAnalyzing}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !resumeText.trim() || !jobDescription.trim()}
            className="px-6 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Resume"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Score */}
            <div className="flex items-center gap-8 p-8 border border-gray-200 rounded-lg">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e5e5" strokeWidth="6" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke={result.score >= 70 ? "#22c55e" : result.score >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="6"
                    strokeDasharray={`${(result.score / 100) * 251} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-black">{result.score}</span>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-black mb-1">Match Score</h2>
                <p className="text-gray-500 text-sm">{result.summary}</p>
              </div>
            </div>

            {/* Keywords */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xs font-medium uppercase tracking-wider text-green-600 mb-4">
                  Keywords Found ({result.keywords.found.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.found.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xs font-medium uppercase tracking-wider text-amber-600 mb-4">
                  Missing Keywords ({result.keywords.missing.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.missing.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 text-sm rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
                Suggestions ({result.suggestions.length})
              </h3>
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
                    <div className="flex items-center gap-2 mb-2">
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
                    <p className="text-sm text-gray-800 font-medium">{s.suggestion}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {!result && (
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {[
              { title: "AI Analysis", desc: "GPT-4 powered resume analysis" },
              { title: "Keyword Matching", desc: "See what's missing from your resume" },
              { title: "Actionable Tips", desc: "Specific suggestions to improve" },
            ].map((f, i) => (
              <div key={i} className="p-6 border border-gray-200 rounded-lg text-center">
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
