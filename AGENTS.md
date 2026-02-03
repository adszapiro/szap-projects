# szap-projects

Personal monorepo for portfolio website and learning projects.

## Structure

```
szap-projects/
├── apps/           # Web applications (Next.js)
├── packages/       # Shared packages (ui, configs)
├── tests/          # E2E tests (Playwright)
└── .cursor/rules/  # AI assistant rules (Cursor-specific)
```

## Tech Stack

- **Framework**: Next.js 15+ with App Router
- **Styling**: Tailwind CSS v4 (no config file - uses CSS variables in `globals.css`)
- **UI**: React 19.x (consistent across monorepo)
- **Language**: TypeScript
- **Icons**: Lucide React (no emojis in production UI)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Deployment**: Vercel

## Search Strategy (Token Conservation)

Priority order for finding code:

1. **Grep** - exact text/symbol searches (fastest, lowest tokens)
2. **Glob** - find files by name pattern
3. **Subagent explore** - broad codebase exploration (use sparingly)

Rules:
- Never read entire files when searching for specific code - grep first, then read specific lines
- Batch parallel searches when possible
- Avoid re-reading files already in context
- Use offset/limit for files over 200 lines

## App-Specific Work (IMPORTANT)

When working on a single app, ONLY read files from that app's directory. Do not read unrelated apps.

**App directories:**
- Quant Agent: `apps/portfolio/app/quant-dashboard/` + `apps/portfolio/components/quant/`
- ResumeAI: `apps/resume-ai/`
- Task Manager: `apps/todo-app/`

**Per-app entry points** (read these first when starting work on an app):
- Quant: `apps/portfolio/app/quant-dashboard/page.tsx`
- Resume: `apps/resume-ai/app/page.tsx`
- Todo: `apps/todo-app/app/page.tsx`

**Shared code** (only read if needed):
- `packages/ui/` - shared components
- `packages/eslint-config/` - linting rules

## Workflow Principles

1. **Plan First**: Enter plan mode for non-trivial tasks (3+ steps or architectural decisions)
2. **Use Subagents**: Offload research and exploration to keep main context clean
3. **Self-Improvement**: After corrections, create rules to prevent the same mistake
4. **Verify Before Done**: Never mark complete without proving it works
5. **Autonomous Bug Fixing**: Just fix bugs - don't ask for hand-holding

## New Project Checklist

Every new app in `apps/` MUST:

1. Add entry to `apps/portfolio/data/projects.ts`:
   ```typescript
   {
     title: "Project Name",
     description: "Short description",
     tech: "Tech1, Tech2, Tech3",
     link: "https://deployed-url.vercel.app",
     status: "live",  // or "in-progress" or "coming-soon"
     featured: true,
     repo: "https://github.com/adszapiro/szap-projects",
     icon: "🚀"
   }
   ```
2. Deploy to Vercel: `vercel --prod --yes`
3. Update portfolio with deployment URL
4. Redeploy portfolio: `cd apps/portfolio && vercel --prod --yes`
5. Commit and push

## Deployment

- **Portfolio**: `alexszapiro.com`
- **Apps**: subdomains (`backtester.alexszapiro.com`, `resume.alexszapiro.com`, etc.)
- **Command**: `vercel --prod --yes` from app directory
- After ANY change to an app, redeploy

## Common Gotchas

1. **Navigation links**: Use `/#section` not `#section` for cross-page nav
2. **Tailwind v4**: No `tailwind.config.ts` - configure via CSS variables in `globals.css`
3. **Vercel rewrites**: Don't work for separate Next.js apps - use subdomains instead
4. **GitHub Actions**: Can't be pushed via OAuth (requires manual push or different auth)
5. **React versions**: Keep consistent across monorepo (currently 19.x)

## Code Style

- **Simplicity First**: Make every change as simple as possible
- **Minimal Impact**: Changes should only touch what's necessary
- **No Temporary Fixes**: Find root causes, apply proper solutions
- **Senior Standards**: Would a staff engineer approve this?
