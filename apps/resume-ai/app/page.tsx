"use client";

import { useState } from "react";
import { FileText, Sparkles, Upload, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

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

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error("Analysis failed. Please try again.");
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
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ResumeAI</h1>
              <p className="text-xs text-gray-500">AI-Powered Resume Tailoring</p>
            </div>
          </div>
          <a
            href="https://portfolio-adszapiro.vercel.app"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Back to Portfolio
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Tailor Your Resume with <span className="gradient-text">AI</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Paste your resume and a job description. Get specific, actionable suggestions to improve your match.
          </p>
        </div>

        {/* Input Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Resume Input */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Your Resume</h3>
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here...

Example:
ALEX SZAPIRO
Software Developer

EXPERIENCE
Junior Developer - TechCorp (2024-Present)
• Built React applications for internal tools
• Collaborated with senior engineers on API design

EDUCATION
University of Michigan - Computer Science (2028)

SKILLS
JavaScript, React, Node.js, Python"
              className="w-full h-64 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              {resumeText.length} characters
            </p>
          </div>

          {/* Job Description Input */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Job Description</h3>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here...

Example:
Software Engineer Intern - Summer 2025

We're looking for a passionate developer to join our team.

Requirements:
• Experience with React and TypeScript
• Familiarity with cloud services (AWS, GCP)
• Strong problem-solving skills
• Excellent communication

Nice to have:
• Open source contributions
• Experience with CI/CD pipelines"
              className="w-full h-64 bg-gray-800/50 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">
              {jobDescription.length} characters
            </p>
          </div>
        </div>

        {/* Analyze Button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !resumeText.trim() || !jobDescription.trim()}
            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 glow"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Analyze & Get Suggestions
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-800 rounded-xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-8">
            {/* Score & Summary */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Score */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#1f2937"
                      strokeWidth="8"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke={result.score >= 70 ? "#22c55e" : result.score >= 50 ? "#eab308" : "#ef4444"}
                      strokeWidth="8"
                      strokeDasharray={`${(result.score / 100) * 352} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{result.score}%</span>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-bold text-white mb-2">Match Score</h3>
                  <p className="text-gray-400">{result.summary}</p>
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Keywords Found ({result.keywords.found.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.found.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-green-900/30 border border-green-800 text-green-400 rounded-full text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Missing Keywords ({result.keywords.missing.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.keywords.missing.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-yellow-900/30 border border-yellow-800 text-yellow-400 rounded-full text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-6">Suggestions ({result.suggestions.length})</h3>
              <div className="space-y-4">
                {result.suggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border ${
                      suggestion.type === "improvement"
                        ? "bg-blue-900/20 border-blue-800"
                        : suggestion.type === "addition"
                        ? "bg-green-900/20 border-green-800"
                        : "bg-yellow-900/20 border-yellow-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        suggestion.type === "improvement"
                          ? "bg-blue-800 text-blue-200"
                          : suggestion.type === "addition"
                          ? "bg-green-800 text-green-200"
                          : "bg-yellow-800 text-yellow-200"
                      }`}>
                        {suggestion.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{suggestion.section}</span>
                    </div>
                    <p className="mt-3 text-white font-medium">{suggestion.suggestion}</p>
                    <p className="mt-2 text-sm text-gray-400">{suggestion.reason}</p>
                    {suggestion.original && (
                      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Original:</p>
                        <p className="text-sm text-gray-400 line-through">{suggestion.original}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {!result && (
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-purple-900/50 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-400 text-sm">GPT-4 analyzes your resume against the job requirements</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-900/50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Keyword Matching</h3>
              <p className="text-gray-400 text-sm">See which keywords you have and which you&apos;re missing</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-green-900/50 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Actionable Suggestions</h3>
              <p className="text-gray-400 text-sm">Get specific improvements to boost your match score</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
          Built by Alex Szapiro | Part of the{" "}
          <a href="https://portfolio-adszapiro.vercel.app" className="text-purple-400 hover:text-purple-300">
            Portfolio
          </a>
        </div>
      </footer>
    </div>
  );
}
