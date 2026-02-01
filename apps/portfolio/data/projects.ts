// ============================================
// Centralized Projects Data
// ============================================
// Links use relative paths - they'll work on alexszapiro.com via rewrites

export interface Project {
  title: string;
  description: string;
  tech: string;
  link: string | null;
  status: "live" | "coming-soon" | "in-progress";
  tier: "featured" | "standard";
  repo?: string;
}

export const projects: Project[] = [
  // FEATURED TIER
  {
    title: "Algo Trading Backtester",
    description: "Professional-grade backtesting platform with TradingView-style charts, custom strategy editor, and multi-asset support. Built to validate trading strategies before risking real capital.",
    tech: "Next.js, TypeScript, Lightweight Charts, Monaco Editor",
    link: "/backtester",
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "AI Quant Agent",
    description: "Autonomous trading agent that combines Claude and OpenAI to debate strategies, learn from historical trades, and execute paper trades via Alpaca. Features multi-model consensus for decision making.",
    tech: "Node.js, TypeScript, OpenAI, Anthropic, Supabase",
    link: null,
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "ResumeAI",
    description: "AI-powered resume optimization. Analyzes your resume against job descriptions, identifies missing keywords, and provides specific suggestions to improve your match score.",
    tech: "Next.js, TypeScript, OpenAI GPT-4",
    link: "/resume-ai",
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "WalletScope",
    description: "On-chain wallet analyzer for Ethereum. Enter any address to see token holdings, portfolio diversification, and risk scoring based on concentration and volatility.",
    tech: "Next.js, TypeScript, Ethereum RPC, CoinGecko",
    link: "/wallet",
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  
  // STANDARD TIER
  {
    title: "Paper Trading Bot",
    description: "Live paper trading dashboard connected to Alpaca. Monitor positions, execute trades, and track performance.",
    tech: "Next.js, TypeScript, Alpaca API",
    link: null,
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "DevPulse",
    description: "GitHub activity dashboard. Visualize contributions, streaks, and top languages for any profile.",
    tech: "Next.js, GitHub API, Recharts",
    link: "/devpulse",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "API Tester",
    description: "Postman-like tool for testing REST APIs in your browser.",
    tech: "Next.js, TypeScript, Tailwind",
    link: "/api-tester",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "SnippetVault",
    description: "Code snippet manager with syntax highlighting and search.",
    tech: "Next.js, TypeScript, Prism",
    link: "/snippets",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "MarkdownPro",
    description: "Live markdown editor with split-view preview and export.",
    tech: "Next.js, TypeScript, Marked",
    link: "/markdown",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "szap-cli",
    description: "CLI tool for scaffolding projects with best practices.",
    tech: "Node.js, Commander, Inquirer",
    link: "https://github.com/adszapiro/szap-projects/tree/main/packages/szap-cli",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "Todo App",
    description: "Task management with Supabase backend.",
    tech: "Next.js, Supabase",
    link: "/todo",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
];

// Helper functions
export const getFeaturedProjects = () => projects.filter(p => p.tier === "featured");
export const getStandardProjects = () => projects.filter(p => p.tier === "standard");
export const getAllProjects = () => projects;
export const getLiveProjects = () => projects.filter(p => p.status === "live");
