import { NextRequest, NextResponse } from "next/server";
import { analyzeResume } from "@/lib/openai";

const TIMEOUT_MS = 30000; // 30 second timeout
const MAX_INPUT_LENGTH = 50000; // Max characters for inputs
const MIN_RESUME_LENGTH = 50; // Minimum meaningful resume length
const MIN_JOB_LENGTH = 30; // Minimum meaningful job description length

// Error codes for client-side handling
export type ErrorCode = 
  | "MISSING_INPUTS"
  | "INVALID_TYPE"
  | "INPUT_TOO_LONG"
  | "INPUT_TOO_SHORT"
  | "API_KEY_MISSING"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "AI_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN";

interface ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: string;
  retryable: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const sendError = (
    error: string,
    code: ErrorCode,
    status: number,
    retryable: boolean = false,
    details?: string
  ) => {
    clearTimeout(timeoutId);
    const response: ErrorResponse = { error, code, retryable };
    if (details) response.details = details;
    return NextResponse.json(response, { status });
  };

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return sendError(
        "Invalid request format. Please check your input.",
        "PARSE_ERROR",
        400
      );
    }

    const { resumeText, jobDescription } = body;

    // Check for missing inputs
    if (!resumeText || !jobDescription) {
      const missing = [];
      if (!resumeText) missing.push("resume");
      if (!jobDescription) missing.push("job description");
      return sendError(
        `Please provide your ${missing.join(" and ")}.`,
        "MISSING_INPUTS",
        400
      );
    }

    // Type validation
    if (typeof resumeText !== "string" || typeof jobDescription !== "string") {
      return sendError(
        "Resume and job description must be text.",
        "INVALID_TYPE",
        400
      );
    }

    // Length validations
    if (resumeText.length > MAX_INPUT_LENGTH) {
      return sendError(
        `Resume is too long. Maximum ${MAX_INPUT_LENGTH.toLocaleString()} characters allowed.`,
        "INPUT_TOO_LONG",
        400,
        false,
        `Your resume has ${resumeText.length.toLocaleString()} characters.`
      );
    }

    if (jobDescription.length > MAX_INPUT_LENGTH) {
      return sendError(
        `Job description is too long. Maximum ${MAX_INPUT_LENGTH.toLocaleString()} characters allowed.`,
        "INPUT_TOO_LONG",
        400,
        false,
        `The job description has ${jobDescription.length.toLocaleString()} characters.`
      );
    }

    if (resumeText.trim().length < MIN_RESUME_LENGTH) {
      return sendError(
        "Resume seems too short. Please provide more details about your experience.",
        "INPUT_TOO_SHORT",
        400,
        false,
        `Minimum ${MIN_RESUME_LENGTH} characters required.`
      );
    }

    if (jobDescription.trim().length < MIN_JOB_LENGTH) {
      return sendError(
        "Job description seems too short. Please provide more details about the role.",
        "INPUT_TOO_SHORT",
        400,
        false,
        `Minimum ${MIN_JOB_LENGTH} characters required.`
      );
    }

    // API key check
    if (!process.env.OPENAI_API_KEY) {
      return sendError(
        "AI service is not configured. Please contact support.",
        "API_KEY_MISSING",
        500
      );
    }

    const result = await analyzeResume(resumeText, jobDescription, controller.signal);
    clearTimeout(timeoutId);

    // Include timing info for client
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      ...result,
      meta: {
        processingTimeMs: processingTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;

    // Handle timeout
    if (error instanceof Error && error.name === "AbortError") {
      return sendError(
        "Analysis timed out. Please try again with shorter inputs.",
        "TIMEOUT",
        408,
        true,
        `Request exceeded ${TIMEOUT_MS / 1000} second limit.`
      );
    }

    // Handle OpenAI-specific errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes("rate limit") || message.includes("429")) {
        return sendError(
          "AI service is temporarily busy. Please try again in a moment.",
          "RATE_LIMITED",
          429,
          true,
          "Too many requests. Wait a few seconds."
        );
      }

      if (message.includes("api key") || message.includes("authentication")) {
        return sendError(
          "AI service authentication failed. Please contact support.",
          "API_KEY_MISSING",
          500
        );
      }

      if (message.includes("json") || message.includes("parse")) {
        return sendError(
          "Failed to process AI response. Please try again.",
          "PARSE_ERROR",
          500,
          true
        );
      }
    }

    console.error("Analysis error:", error, `(elapsed: ${elapsed}ms)`);
    return sendError(
      "Something went wrong during analysis. Please try again.",
      "UNKNOWN",
      500,
      true
    );
  }
}
