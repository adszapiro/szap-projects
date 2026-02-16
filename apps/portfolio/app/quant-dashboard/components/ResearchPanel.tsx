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
      <div className="bg-[#1a1512] border border-[#2a2420]/40 rounded-2xl p-12 text-center">
        <svg className="w-12 h-12 text-[#9b8772] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="text-[#9b8772]">No research papers loaded</p>
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
          className="bg-[#1a1512] border border-[#2a2420]/40 rounded-2xl overflow-hidden hover:border-[#3d342b] transition-colors duration-200"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-[#f5e6d3] mb-1 line-clamp-2">{paper.title}</h3>
                <p className="text-xs text-[#9b8772]">{paper.authors?.join(", ")} {paper.year}</p>
              </div>
              <span className={`ml-3 text-[10px] px-2 py-1 rounded font-mono ${
                paper.status === "active" ? "bg-[#9cb870]/20 text-[#9cb870]" :
                paper.status === "extracted" ? "bg-[#d4a574]/20 text-[#d4a574]" :
                "bg-[#211d19] text-[#9b8772]"
              }`}>
                {paper.status.toUpperCase()}
              </span>
            </div>
            {paper.key_insights && paper.key_insights.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-[#9b8772] uppercase mb-2">Key Insights</p>
                <ul className="space-y-1">
                  {paper.key_insights.slice(0, 3).map((insight, i) => (
                    <li key={i} className="text-xs text-[#c9b79c] flex items-start gap-2">
                      <span className="text-[#d4a574] mt-0.5">&#8226;</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-[#2a2420]/30">
              <span className="text-[10px] text-[#9b8772] font-mono">{paper.source}</span>
              {paper.pdf_url && (
                <a href={paper.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#d4a574] hover:text-[#e6b889] transition-colors duration-200">
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
