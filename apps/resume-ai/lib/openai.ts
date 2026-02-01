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

export interface AnalysisResult {
  score: number;
  suggestions: {
    type: "improvement" | "addition" | "warning";
    section: string;
    original?: string;
    suggestion: string;
    reason: string;
  }[];
  keywords: {
    found: string[];
    missing: string[];
  };
  summary: string;
}

export async function analyzeResume(
  resumeText: string,
  jobDescription: string
): Promise<AnalysisResult> {
  const openai = getOpenAI();

  const systemPrompt = `You are an expert resume reviewer and career coach. Your job is to analyze a resume against a job description and provide specific, actionable feedback.

Analyze the resume and job description, then return a JSON object with this exact structure:
{
  "score": <number 0-100 representing how well the resume matches>,
  "summary": "<brief 1-2 sentence summary of the match>",
  "keywords": {
    "found": ["<keywords from job desc that ARE in resume>"],
    "missing": ["<important keywords from job desc NOT in resume>"]
  },
  "suggestions": [
    {
      "type": "improvement" | "addition" | "warning",
      "section": "<which section of resume this applies to>",
      "original": "<original text if improving something>",
      "suggestion": "<specific suggested change or addition>",
      "reason": "<why this helps match the job>"
    }
  ]
}

Guidelines:
- Score 80+ means excellent match
- Score 60-79 means good match with improvements needed
- Score 40-59 means moderate match, significant work needed
- Score below 40 means poor match
- Focus on ATS (Applicant Tracking System) optimization
- Prioritize the most impactful suggestions first
- Be specific - don't just say "add more details", say exactly what to add
- Limit to 5-8 most important suggestions`;

  const userPrompt = `RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Analyze this resume against the job description and provide your assessment in the JSON format specified.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const result = JSON.parse(content) as AnalysisResult;
  return result;
}
