import { NextRequest, NextResponse } from "next/server";
import { analyzeResume } from "@/lib/openai";

const TIMEOUT_MS = 30000; // 30 second timeout
const MAX_INPUT_LENGTH = 50000; // Max characters for inputs

export async function POST(request: NextRequest) {
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { resumeText, jobDescription } = await request.json();

    if (!resumeText || !jobDescription) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "Resume and job description are required" },
        { status: 400 }
      );
    }

    // Input validation
    if (typeof resumeText !== "string" || typeof jobDescription !== "string") {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "Resume and job description must be strings" },
        { status: 400 }
      );
    }

    if (resumeText.length > MAX_INPUT_LENGTH || jobDescription.length > MAX_INPUT_LENGTH) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: `Input too long. Maximum ${MAX_INPUT_LENGTH} characters allowed.` },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const result = await analyzeResume(resumeText, jobDescription);
    clearTimeout(timeoutId);

    return NextResponse.json(result);
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. Please try again with shorter inputs." },
        { status: 408 }
      );
    }

    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume. Please try again." },
      { status: 500 }
    );
  }
}
