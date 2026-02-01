---
name: add-portfolio-project
description: Add a new project to the portfolio featured projects section. Use when the user creates a new app or project they want showcased on their portfolio website.
---

# Add Portfolio Project

Adds new projects to the centralized projects data file and updates the portfolio.

## Quick Start

When adding a new project to the portfolio:

1. Edit `apps/portfolio/data/projects.ts`
2. Add a new entry to the `projects` array
3. Commit and deploy

## Project Schema

```typescript
{
  title: string;          // Project name
  description: string;    // 1-2 sentence description
  tech: string;           // Comma-separated tech stack
  link: string | null;    // Deployed URL or null
  status: "live" | "coming-soon" | "in-progress";
  featured: boolean;      // Show on homepage
  repo?: string;          // GitHub repo URL
  icon?: string;          // Emoji icon
}
```

## Example

```typescript
{
  title: "My New App",
  description: "A brief description of what the app does and its key features.",
  tech: "Next.js, TypeScript, Tailwind CSS",
  link: "https://my-app.vercel.app",
  status: "live",
  featured: true,
  repo: "https://github.com/adszapiro/szap-projects",
  icon: "🚀"
}
```

## Workflow

1. **After creating a new app**, ask the user if they want it added to the portfolio
2. **Determine details**:
   - Project title
   - Brief description (what it does)
   - Tech stack used
   - Deployment URL (if deployed)
   - Status (live, in-progress, coming-soon)
3. **Edit the data file** at `apps/portfolio/data/projects.ts`
4. **Commit and push** to trigger Vercel deployment

## File Location

```
apps/portfolio/data/projects.ts
```

## Notes

- Keep descriptions concise (1-2 sentences)
- Use relevant emoji for icons
- Set `featured: true` to show on homepage
- Projects without links show "Coming Soon" badge
