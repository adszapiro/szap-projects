# Szap Projects

A Turborepo monorepo containing **12+ production applications** built by Alex Szapiro. Full-stack web apps, AI tools, trading systems, and developer utilities.

[![Portfolio](https://img.shields.io/badge/Portfolio-Live-brightgreen)](https://portfolio-adszapiro.vercel.app)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://www.linkedin.com/in/alex-szapiro/)
[![Email](https://img.shields.io/badge/Email-aszapiro%40umich.edu-red)](mailto:aszapiro@umich.edu)

---

## Featured Projects

### AI & Machine Learning
| Project | Description | Tech Stack | Demo |
|---------|-------------|------------|------|
| **ResumeAI** | AI-powered resume analyzer that matches resumes to job descriptions using GPT-4 | Next.js, OpenAI GPT-4, TypeScript | [Live](https://resume-ai-sooty-seven.vercel.app) |
| **AI Quant Agent** | Autonomous trading agent with Claude + GPT-4 debate system for strategy selection | Node.js, Anthropic, OpenAI, Supabase | Private |

### Trading & Finance
| Project | Description | Tech Stack | Demo |
|---------|-------------|------------|------|
| **Algo Backtester** | TradingView-style backtesting platform with custom strategy editor | Next.js, Lightweight Charts, Monaco Editor | [Live](https://szap-backtester.vercel.app) |
| **Paper Trading Bot** | Real-time paper trading dashboard connected to Alpaca | Next.js, Alpaca API, TypeScript | Private |
| **WalletScope** | Ethereum wallet analyzer with risk scoring and portfolio metrics | Next.js, Ethereum RPC, CoinGecko API | [Live](https://wallet-scope.vercel.app) |

### Developer Tools
| Project | Description | Tech Stack | Demo |
|---------|-------------|------------|------|
| **szap-cli** | CLI tool for scaffolding Next.js apps, APIs, and libraries | Node.js, Commander, Inquirer, Chalk | [NPM](./packages/szap-cli) |
| **API Tester** | Postman-like REST API testing tool in the browser | Next.js, TypeScript, Tailwind CSS | [Live](https://api-tester-two-teal.vercel.app) |
| **SnippetVault** | Code snippet manager with syntax highlighting | Next.js, Prism, localStorage | [Live](https://snippet-vault-lime.vercel.app) |
| **MarkdownPro** | Live markdown editor with split-view preview | Next.js, Marked, localStorage | [Live](https://markdown-pro-nu.vercel.app) |

### Productivity & Analytics
| Project | Description | Tech Stack | Demo |
|---------|-------------|------------|------|
| **DevPulse** | GitHub activity dashboard with contribution graphs and streak tracking | Next.js, GitHub API, Recharts | [Live](https://devpulse-ivory.vercel.app) |
| **Smart Todo** | Task manager with email integration from coaching sessions | Next.js, Supabase, Google Apps Script | [Live](https://alexszapiro-to-do.vercel.app) |
| **Portfolio** | Personal portfolio with 3D graphics and animations | Next.js, Three.js, Framer Motion | [Live](https://portfolio-adszapiro.vercel.app) |

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **3D/Graphics** | Three.js, React Three Fiber, Framer Motion |
| **Backend** | Node.js, Supabase, REST APIs |
| **AI/ML** | OpenAI GPT-4, Anthropic Claude, Custom Agents |
| **Data** | Recharts, Lightweight Charts, Prism |
| **Infrastructure** | Turborepo, Vercel, GitHub Actions |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/adszapiro/szap-projects.git
cd szap-projects

# Install dependencies
npm install

# Run all apps in development
npm run dev

# Run a specific app
npm run dev --filter=portfolio
npm run dev --filter=resume-ai

# Build all apps
npm run build
```

---

## Project Structure

```
szap-projects/
├── apps/
│   ├── portfolio/          # Personal portfolio website
│   ├── resume-ai/          # AI resume analyzer
│   ├── wallet-scope/       # Crypto wallet analyzer
│   ├── devpulse/           # GitHub activity dashboard
│   ├── snippet-vault/      # Code snippet manager
│   ├── markdown-pro/       # Markdown editor
│   ├── api-tester/         # REST API testing tool
│   ├── backtester/         # Trading strategy backtester
│   ├── trading-bot/        # Paper trading system
│   ├── todo-app/           # Task management app
│   └── quant-agent/        # AI trading agent
│
├── packages/
│   ├── szap-cli/           # Project scaffolding CLI
│   ├── eslint-config/      # Shared ESLint config
│   ├── tailwind-config/    # Shared Tailwind config
│   └── typescript-config/  # Shared TypeScript config
│
├── turbo.json              # Turborepo configuration
└── package.json            # Root workspace config
```

---

## About Me

I'm a student at the **University of Michigan** studying Economics with a focus on technology and finance. I build software that solves real problems at the intersection of AI, trading, and developer productivity.

**Currently seeking internship opportunities for Summer 2026.**

- **Portfolio:** [portfolio-adszapiro.vercel.app](https://portfolio-adszapiro.vercel.app)
- **LinkedIn:** [linkedin.com/in/alex-szapiro](https://www.linkedin.com/in/alex-szapiro/)
- **Email:** aszapiro@umich.edu
- **GitHub:** [@adszapiro](https://github.com/adszapiro)

---

## License

MIT License - feel free to use this code for learning and inspiration.
