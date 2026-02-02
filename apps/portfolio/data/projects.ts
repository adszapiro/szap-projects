// ============================================
// Centralized Projects Data
// ============================================
// Links use subdomains: backtester.alexszapiro.com, etc.

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  title: string;
  description: string;
  tech: string;
  link: string | null;
  links?: ProjectLink[]; // Multiple links (e.g., GitHub + Live Dashboard)
  status: "live" | "coming-soon" | "in-progress";
  tier: "featured" | "standard";
  repo?: string;
}

export const projects: Project[] = [
  // FEATURED TIER
  {
    title: "Algo Trading Backtester",
    description: "Professional-grade backtesting platform supporting 500+ stocks and 50+ crypto pairs. Features TradingView-style charts, custom JavaScript strategy editor, and multi-asset comparison with risk metrics.",
    tech: "Next.js, TypeScript, Lightweight Charts, Monaco Editor",
    link: "https://backtester.alexszapiro.com",
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "AI Quant Agent",
    description: "Dual-model AI trading agent using GPT-4 and Claude in a debate system for strategy generation. Executes paper trades via Alpaca with risk management (5% daily loss limit) and Supabase logging.",
    tech: "Node.js, TypeScript, OpenAI, Anthropic, Supabase",
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
    title: "WalletScope",
    description: "Ethereum wallet analyzer with real-time balance fetching, portfolio distribution charts, and risk scoring. Analyzes concentration, volatility, and diversification for any public address.",
    tech: "Next.js, TypeScript, Ethereum RPC, CoinGecko, Recharts",
    link: "https://wallet.alexszapiro.com",
    status: "live",
    tier: "featured",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  
  // STANDARD TIER - Trading & Finance
  {
    title: "Paper Trading Bot",
    description: "Real-time paper trading dashboard with Alpaca integration. View account balance, positions, orders, and execute market/limit trades with demo mode for showcasing.",
    tech: "Next.js, TypeScript, Alpaca API",
    link: "https://trading.alexszapiro.com",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  
  // STANDARD TIER - Developer Tools
  {
    title: "DevPulse",
    description: "GitHub profile analyzer with contribution graphs, streak tracking, and language breakdown. Visualize any developer's activity at a glance.",
    tech: "Next.js, GitHub API, Recharts",
    link: "https://devpulse.alexszapiro.com",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "API Tester",
    description: "Browser-based REST API testing tool with request history, multiple HTTP methods, and response formatting.",
    tech: "Next.js, TypeScript, Tailwind",
    link: "https://api.alexszapiro.com",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "SnippetVault",
    description: "Code snippet manager with syntax highlighting, tagging, and search. Save and organize reusable code blocks.",
    tech: "Next.js, TypeScript, Prism",
    link: "https://snippets.alexszapiro.com",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "MarkdownPro",
    description: "Markdown editor with live preview, multiple view modes, document management, and export to HTML.",
    tech: "Next.js, TypeScript, Marked",
    link: "https://markdown.alexszapiro.com",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "szap-cli",
    description: "CLI tool for scaffolding Next.js projects, APIs, and libraries with best practices built-in.",
    tech: "Node.js, Commander, Inquirer",
    link: "https://github.com/adszapiro/szap-projects/tree/main/packages/szap-cli",
    status: "live",
    tier: "standard",
    repo: "https://github.com/adszapiro/szap-projects",
  },
  {
    title: "Task Manager",
    description: "Full-stack task management app with categories, due dates, and Supabase backend.",
    tech: "Next.js, Supabase, TypeScript",
    link: "https://todo.alexszapiro.com",
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
