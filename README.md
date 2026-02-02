# Szap Projects

A Turborepo monorepo containing **12+ production applications** showcasing full-stack development, AI/ML integration, and FinTech tools.

[![Portfolio](https://img.shields.io/badge/Portfolio-alexszapiro.com-brightgreen)](https://alexszapiro.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue)](https://www.linkedin.com/in/alex-szapiro/)
[![Email](https://img.shields.io/badge/Email-aszapiro%40umich.edu-red)](mailto:aszapiro@umich.edu)

---

## Featured Projects

### Algo Trading Backtester
**Professional-grade trading strategy backtester supporting 500+ stocks and 50+ crypto pairs.**

- TradingView-style charts with real-time data
- Custom strategy editor with JavaScript execution
- Multi-asset comparison and risk analytics
- [Live Demo](https://backtester.alexszapiro.com) | [Code](./apps/backtester)

### AI Quant Agent
**Autonomous trading agent using dual-model AI (GPT-4 + Claude) for strategy generation.**

- Multi-model debate system for strategy selection
- Real-time paper trading via Alpaca API
- Risk management with daily loss limits
- Supabase logging and performance tracking
- [Code](./apps/quant-agent)

### WalletScope
**Ethereum wallet analyzer with risk scoring and portfolio visualization.**

- Real-time ETH balance and token holdings
- Portfolio distribution charts
- Risk factor analysis
- [Live Demo](https://walletscope.alexszapiro.com) | [Code](./apps/wallet-scope)

### ResumeAI
**GPT-4 powered resume analyzer that matches resumes to job descriptions.**

- PDF upload with automatic parsing
- Match score with detailed breakdown
- Actionable improvement suggestions
- [Live Demo](https://resume.alexszapiro.com) | [Code](./apps/resume-ai)

---

## All Projects

### Trading & Finance
| Project | Description | Live Demo |
|---------|-------------|-----------|
| Algo Backtester | TradingView-style backtesting platform | [backtester.alexszapiro.com](https://backtester.alexszapiro.com) |
| Paper Trading Bot | Real-time paper trading dashboard | [trading.alexszapiro.com](https://trading.alexszapiro.com) |
| WalletScope | Ethereum wallet analyzer | [walletscope.alexszapiro.com](https://walletscope.alexszapiro.com) |
| AI Quant Agent | Autonomous trading agent | Backend only |

### AI & Productivity
| Project | Description | Live Demo |
|---------|-------------|-----------|
| ResumeAI | AI resume analyzer | [resume.alexszapiro.com](https://resume.alexszapiro.com) |
| DevPulse | GitHub activity dashboard | [devpulse.alexszapiro.com](https://devpulse.alexszapiro.com) |
| Task Manager | Task management with email integration | [todo.alexszapiro.com](https://todo.alexszapiro.com) |

### Developer Tools
| Project | Description | Live Demo |
|---------|-------------|-----------|
| API Tester | REST API testing tool | [api.alexszapiro.com](https://api.alexszapiro.com) |
| SnippetVault | Code snippet manager | [snippets.alexszapiro.com](https://snippets.alexszapiro.com) |
| MarkdownPro | Markdown editor with live preview | [markdown.alexszapiro.com](https://markdown.alexszapiro.com) |

---

## Tech Stack

| Category | Technologies |
|----------|--------------|
| **Frontend** | Next.js 15+, React 19, TypeScript, Tailwind CSS v4 |
| **Backend** | Node.js, Supabase, REST APIs |
| **AI/ML** | OpenAI GPT-4, Anthropic Claude |
| **Trading** | Alpaca API, Lightweight Charts, Monaco Editor |
| **Blockchain** | Ethereum RPC, CoinGecko API |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Infrastructure** | Turborepo, Vercel, GitHub Actions |

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm 11+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/adszapiro/szap-projects.git
cd szap-projects

# Install dependencies
npm install

# Run all apps in development
npm run dev

# Run a specific app
npm run dev -w portfolio
npm run dev -w backtester

# Build all apps
npm run build

# Run tests
npm run test:unit
npm run test:e2e
```

### Environment Variables

Some apps require API keys. Copy the example files and add your keys:

```bash
# For ResumeAI (requires OpenAI)
cp apps/resume-ai/.env.example apps/resume-ai/.env.local

# For Trading Bot (requires Alpaca)
cp apps/trading-bot/.env.example apps/trading-bot/.env.local
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

I'm a student at the **University of Michigan** (B.A. Economics, Minor in Real Estate) who is self-taught in software engineering. I build tools at the intersection of finance and technology.

**Incoming Private Credit Intern at Churchill Real Estate (Summer 2025)**

- **Portfolio:** [alexszapiro.com](https://alexszapiro.com)
- **LinkedIn:** [linkedin.com/in/alex-szapiro](https://www.linkedin.com/in/alex-szapiro/)
- **Email:** aszapiro@umich.edu
- **GitHub:** [@adszapiro](https://github.com/adszapiro)

---

## License

MIT License
