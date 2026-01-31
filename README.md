# Szap Projects

A monorepo containing Alex Szapiro's portfolio of web applications, built with Next.js, React, and TypeScript.

## Apps

| App | Description | Tech Stack |
|-----|-------------|------------|
| [portfolio](./apps/portfolio) | Personal portfolio website | Next.js, Tailwind CSS, TypeScript |
| [todo-app](./apps/todo-app) | Task management with categories | Next.js, React, Local Storage |
| expense-tracker | Track spending by category | Coming soon |
| investment-tracker | Monitor portfolio performance | Coming soon |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/adszapiro/szap-projects.git
cd szap-projects

# Install dependencies
npm install
```

### Development

```bash
# Run all apps in development mode
npm run dev

# Run a specific app
npm run dev --filter=portfolio
npm run dev --filter=todo-app
```

### Build

```bash
# Build all apps
npm run build

# Build a specific app
npm run build --filter=portfolio
```

## Project Structure

```
szap-projects/
├── apps/
│   ├── portfolio/         # Personal portfolio website
│   ├── todo-app/          # Task management app
│   ├── expense-tracker/   # (Coming soon)
│   └── investment-tracker/ # (Coming soon)
├── packages/
│   ├── eslint-config/     # Shared ESLint configuration
│   ├── tailwind-config/   # Shared Tailwind configuration
│   ├── typescript-config/ # Shared TypeScript configuration
│   └── ui/                # Shared UI components
├── turbo.json             # Turborepo configuration
└── package.json           # Root package.json
```

## Technologies

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Monorepo**: Turborepo
- **Deployment**: Vercel

## Author

**Alex Szapiro**
- GitHub: [@adszapiro](https://github.com/adszapiro)
- LinkedIn: [alex-szapiro](https://www.linkedin.com/in/alex-szapiro/)
- Email: aszapiro@umich.edu

## License

MIT
