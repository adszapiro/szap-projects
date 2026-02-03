// ============================================
// Centralized Projects Data
// ============================================

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  title: string;
  description: string;
  tech: string;
  link: string | null;
  links?: ProjectLink[];
  status: "live" | "coming-soon" | "in-progress";
  tier: "featured" | "standard";
  repo?: string;
}

export const projects: Project[] = [
  {
    title: "AI Quant Agent",
    description: "Tournament-style trading system with 55+ strategies from academic research papers. Uses Thompson Sampling to dynamically allocate capital based on performance. Features real-time learning from losses, paper trading via Alpaca, and a professional monitoring dashboard.",
    tech: "Node.js, TypeScript, Supabase, Alpaca API, Thompson Sampling",
    link: "/quant-dashboard",
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects/tree/main/apps/quant-agent",
  },
  {
    title: "ResumeAI",
    description: "GPT-4 powered resume analyzer with PDF upload support. Provides match scores, identifies missing keywords, and generates actionable suggestions for tailoring resumes to specific job descriptions.",
    tech: "Next.js, TypeScript, OpenAI GPT-4, PDF.js",
    link: "https://resume.alexszapiro.com",
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "Task Manager",
    description: "Full-stack task management app with categories, due dates, priority levels, and Supabase backend for persistent storage.",
    tech: "Next.js, Supabase, TypeScript, Tailwind",
    link: "https://todo.alexszapiro.com",
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects",
  },
];

// Helper functions
export const getFeaturedProjects = () => projects.filter(p => p.tier === "featured");
export const getStandardProjects = () => projects.filter(p => p.tier === "standard");
export const getAllProjects = () => projects;
export const getLiveProjects = () => projects.filter(p => p.status === "live");
