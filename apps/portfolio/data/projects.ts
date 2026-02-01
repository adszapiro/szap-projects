// ============================================
// Centralized Projects Data
// ============================================
// All featured projects are defined here
// To add a new project, add an entry to the array below

export interface Project {
  title: string;
  description: string;
  tech: string;
  link: string | null;
  status: "live" | "coming-soon" | "in-progress";
  featured: boolean;
  repo?: string;
  icon?: string;
}

export const projects: Project[] = [
  {
    title: "ResumeAI",
    description: "AI-powered resume tailoring SaaS. Paste your resume + job description, get specific suggestions to improve your match score.",
    tech: "Next.js, TypeScript, OpenAI GPT-4, Tailwind CSS",
    link: "https://szap-resume-ai.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "📄"
  },
  {
    title: "WalletScope",
    description: "On-chain crypto wallet analyzer. Enter any Ethereum address to see holdings, risk score, and diversification metrics.",
    tech: "Next.js, TypeScript, Ethereum RPC, CoinGecko API",
    link: "https://szap-wallet-scope.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "🔍"
  },
  {
    title: "Algo Trading Backtester",
    description: "A professional-grade backtesting platform with TradingView-style charts, custom strategy editor, and multi-asset support.",
    tech: "Next.js, TypeScript, Lightweight Charts, Monaco Editor",
    link: "https://szap-backtester.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "📈"
  },
  {
    title: "AI Quant Agent",
    description: "Autonomous trading agent powered by Claude + OpenAI that debates strategies, learns from trades, and executes on Alpaca.",
    tech: "Node.js, TypeScript, OpenAI, Anthropic, Supabase",
    link: null,
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "🤖"
  },
  {
    title: "Paper Trading Bot",
    description: "Live paper trading dashboard connected to Alpaca. Monitor positions, execute trades, and track performance.",
    tech: "Next.js, TypeScript, Alpaca API",
    link: null,
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "💹"
  },
  {
    title: "Smart Todo App",
    description: "Task management with automated email parsing. Syncs with Google Docs attachments from weekly coaching emails.",
    tech: "Next.js, TypeScript, Supabase, Google Apps Script",
    link: "https://alexszapiro-to-do.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "✅"
  },
];

// Helper to get only featured projects
export const getFeaturedProjects = () => projects.filter(p => p.featured);

// Helper to get live projects
export const getLiveProjects = () => projects.filter(p => p.status === "live");
