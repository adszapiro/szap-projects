"use client";

import { motion } from "framer-motion";
import type { ResearchPaper, Strategy } from "@/lib/supabase";

interface ResearchPanelProps {
  papers: ResearchPaper[];
  strategies: Strategy[];
}

export default function ResearchPanel({ papers, strategies }: ResearchPanelProps) {
  if (papers.length === 0) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-2xl p-12 text-center">
        <svg className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="text-[var(--text-muted)]">No research papers loaded</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      {papers.map((paper, idx) => (
        <motion.div
          key={paper.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="bg-[var(--card-bg)] border border-[var(--border)]/40 rounded-2xl overflow-hidden hover:border-[var(--border-hover)] transition-colors duration-200"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-[var(--text)] mb-1 line-clamp-2">{paper.title}</h3>
                <p className="text-xs text-[var(--text-muted)]">{paper.authors?.join(", ")} {paper.year}</p>
              </div>
              <span className={`ml-3 text-[10px] px-2 py-1 rounded font-mono ${
                paper.status === "active" ? "bg-[var(--positive)]/20 text-[var(--positive)]" :
                paper.status === "extracted" ? "bg-[var(--accent)]/20 text-[var(--accent)]" :
                "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              }`}>
                {paper.status.toUpperCase()}
              </span>
            </div>
            {paper.key_insights && paper.key_insights.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-[var(--text-muted)] uppercase mb-2">Key Insights</p>
                <ul className="space-y-1">
                  {paper.key_insights.slice(0, 3).map((insight, i) => (
                    <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                      <span className="text-[var(--accent)] mt-0.5">&#8226;</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]/30">
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{paper.source}</span>
              {paper.pdf_url && (
                <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-200">
                  View Paper &rarr;
                </a>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
