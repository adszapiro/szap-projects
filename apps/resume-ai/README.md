# ResumeAI

GPT-4 powered resume analyzer that matches resumes to job descriptions and provides actionable improvement suggestions.

## Features

- **PDF Upload** - Upload resume as PDF with automatic text extraction
- **Match Scoring** - Calculates compatibility score between resume and job description
- **Keyword Analysis** - Identifies missing keywords and skills
- **Improvement Suggestions** - Provides specific, actionable recommendations
- **Sample Data** - One-click sample resume and job description for demo
- **Progress Tracking** - Visual progress indicator during analysis

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **AI**: OpenAI GPT-4
- **PDF Parsing**: PDF.js (client-side)
- **Styling**: Tailwind CSS v4

## Quick Start

```bash
# Set up environment variable
cp .env.example .env.local
# Add your OpenAI API key to .env.local

# From the monorepo root
npm run dev -w resume-ai

# Or from this directory
npm run dev
```

The app runs on `http://localhost:3001` by default.

## Environment Variables

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

## How It Works

1. **Paste or Upload Resume** - Enter resume text or upload a PDF
2. **Add Job Description** - Paste the target job description
3. **Analyze** - GPT-4 analyzes the match and provides feedback
4. **Review Results** - See match score, missing keywords, and suggestions

## API Endpoint

`POST /api/analyze`

Request body:
```json
{
  "resumeText": "Resume content...",
  "jobDescription": "Job description..."
}
```

Response includes match score, missing keywords, strengths, and improvement suggestions.

## License

MIT
