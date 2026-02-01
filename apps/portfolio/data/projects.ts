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
    title: "MarkdownPro",
    description: "Live markdown editor with split-view preview, dark/light themes, export to HTML, and local storage autosave.",
    tech: "Next.js, TypeScript, Marked, localStorage",
    link: "https://markdown-pro-nu.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "📝"
  },
  {
    title: "API Tester",
    description: "Postman-like tool for testing REST APIs in your browser. Send requests, view responses, manage headers.",
    tech: "Next.js, TypeScript, Tailwind CSS",
    link: "https://api-tester-two-teal.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "🔌"
  },
  {
    title: "szap-cli",
    description: "CLI tool for scaffolding projects. Create Next.js apps, APIs, and libraries with best practices in seconds.",
    tech: "Node.js, TypeScript, Commander, Inquirer, Chalk",
    link: "https://github.com/adszapiro/szap-projects/tree/main/packages/szap-cli",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "⚡"
  },
  {
    title: "SnippetVault",
    description: "Code snippet manager with beautiful syntax highlighting. Save, organize, search, and share code snippets.",
    tech: "Next.js, TypeScript, Prism, localStorage",
    link: "https://snippet-vault-lime.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "💾"
  },
  {
    title: "DevPulse",
    description: "GitHub activity dashboard. Visualize contributions, streaks, top languages, and recent repos for any GitHub profile.",
    tech: "Next.js, TypeScript, GitHub API, Recharts",
    link: "https://devpulse-ivory.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "📊"
  },
  {
    title: "ResumeAI",
    description: "AI-powered resume tailoring SaaS. Paste your resume + job description, get specific suggestions to improve your match score.",
    tech: "Next.js, TypeScript, OpenAI GPT-4, Tailwind CSS",
    link: "https://resume-ai-sooty-seven.vercel.app",
    status: "live",
    featured: true,
    repo: "https://github.com/adszapiro/szap-projects",
    icon: "📄"
  },
  {
    title: "WalletScope",
    description: "On-chain crypto wallet analyzer. Enter any Ethereum address to see holdings, risk score, and diversification metrics.",
    tech: "Next.js, TypeScript, Ethereum RPC, CoinGecko API",
    link: "https://wallet-scope.vercel.app",
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
