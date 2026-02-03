import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

export interface SectionScore {
  score: number;
  feedback: string;
}

export interface SectionScores {
  experience: SectionScore;
  skills: SectionScore;
  education: SectionScore;
  overall: SectionScore;
}

export interface Suggestion {
  type: "improvement" | "addition" | "warning";
  section: string;
  original?: string;
  suggestion: string;
  reason: string;
}

export interface AnalysisResult {
  score: number;
  sectionScores: SectionScores;
  suggestions: Suggestion[];
  keywords: {
    found: string[];
    missing: string[];
  };
  summary: string;
}

export async function analyzeResume(
  resumeText: string,
  jobDescription: string,
  signal?: AbortSignal
): Promise<AnalysisResult> {
  const openai = getOpenAI();

  const systemPrompt = `You are an expert resume reviewer and career coach. Your job is to analyze a resume against a job description and provide specific, actionable feedback.

Analyze the resume and job description, then return a JSON object with this exact structure:
{
  "score": <number 0-100 representing overall match>,
  "sectionScores": {
    "experience": {
      "score": <0-100>,
      "feedback": "<1 sentence feedback for experience section>"
    },
    "skills": {
      "score": <0-100>,
      "feedback": "<1 sentence feedback for skills section>"
    },
    "education": {
      "score": <0-100>,
      "feedback": "<1 sentence feedback for education section>"
    },
    "overall": {
      "score": <0-100>,
      "feedback": "<1 sentence overall resume quality feedback>"
    }
  },
  "summary": "<brief 1-2 sentence summary of the match>",
  "keywords": {
    "found": ["<keywords from job desc that ARE in resume>"],
    "missing": ["<important keywords from job desc NOT in resume>"]
  },
  "suggestions": [
    {
      "type": "improvement" | "addition" | "warning",
      "section": "<which section of resume this applies to>",
      "original": "<original text if improving something, or null>",
      "suggestion": "<specific suggested change or addition>",
      "reason": "<why this helps match the job>"
    }
  ]
}

Guidelines for scoring:
- Score 80+ means excellent match
- Score 60-79 means good match with improvements needed
- Score 40-59 means moderate match, significant work needed
- Score below 40 means poor match

Section-specific scoring:
- Experience: Evaluate relevance of work history, use of action verbs, quantified achievements
- Skills: Check for technical skill alignment, missing key technologies, skill organization
- Education: Assess relevance to role, certifications, GPA if notable
- Overall: Consider formatting, ATS optimization, completeness, professional tone

Additional guidelines:
- Focus on ATS (Applicant Tracking System) optimization
- Prioritize the most impactful suggestions first
- Be specific - don't just say "add more details", say exactly what to add
- Limit to 5-8 most important suggestions
- If a section is missing from the resume, score it as 0 and note it needs to be added`;

  const userPrompt = `RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Analyze this resume against the job description and provide your assessment in the JSON format specified.`;

  const response = await openai.chat.completions.create(
    {
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    },
    { signal }
  );

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const result = JSON.parse(content) as AnalysisResult;
  return result;
}
