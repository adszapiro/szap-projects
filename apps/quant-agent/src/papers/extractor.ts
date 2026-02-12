/**
 * Strategy Extractor
 * Uses Claude to extract trading strategies from research papers
 */

import Anthropic from "@anthropic-ai/sdk";
import { ExtractedStrategy, PaperMetadata } from "./types.js";
import { validateStrategyCode as sandboxValidate } from "../sandbox.js";

// Lazy initialization to ensure env vars are loaded
let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set");
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

const EXTRACTION_PROMPT = `You are a quantitative finance researcher. Analyze this research paper and extract implementable trading strategies.

For each strategy you identify, provide:
1. A clear name for the strategy
2. A description of what it does
3. Whether it applies to stocks, crypto, or both
4. Suggested symbols to trade
5. Key insights from the paper
6. The trading logic in plain English
7. Executable JavaScript code that implements the strategy

The code should follow this exact format:
\`\`\`javascript
function generateSignal(data, position) {
  // data.close, data.high, data.low, data.volume, data.open are arrays
  // position is { qty, avgEntryPrice } or null
  // Return: { type: "buy"|"sell"|"hold", confidence: 0-1, reason: string }
  
  // Your implementation here
  
  return { type: "hold", confidence: 0.5, reason: "Description" };
}
\`\`\`

Respond in JSON format:
{
  "strategies": [
    {
      "name": "Strategy Name",
      "description": "What it does",
      "assetClass": "stock" | "crypto" | "both",
      "symbols": ["SPY", "QQQ"],
      "keyInsights": ["insight 1", "insight 2"],
      "tradingLogic": "Plain English description",
      "code": "function generateSignal(data, position) { ... }",
      "confidence": 0.8
    }
  ]
}`;

export async function extractStrategiesFromText(
  text: string,
  metadata?: Partial<PaperMetadata>
): Promise<ExtractedStrategy[]> {
  const context = metadata
    ? `Paper: "${metadata.title}" by ${metadata.authors?.join(", ")} (${metadata.year})\n\n`
    : "";

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\n${context}Paper content:\n\n${text.slice(0, 50000)}`, // Limit to 50k chars
      },
    ],
  });

  // Parse JSON response
  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    // Extract JSON from response (might be wrapped in markdown)
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // Try to find raw JSON
      const startIdx = jsonStr.indexOf("{");
      const endIdx = jsonStr.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.slice(startIdx, endIdx + 1);
      }
    }

    const parsed = JSON.parse(jsonStr);
    const strategies = parsed.strategies;
    if (!Array.isArray(strategies)) return [];

    // Validate each strategy matches expected schema
    return strategies.filter((s: unknown): s is ExtractedStrategy => {
      if (!s || typeof s !== "object") return false;
      const obj = s as Record<string, unknown>;
      return (
        typeof obj.name === "string" &&
        typeof obj.code === "string" &&
        typeof obj.description === "string" &&
        typeof obj.confidence === "number" &&
        obj.confidence >= 0 && obj.confidence <= 1 &&
        Array.isArray(obj.symbols) &&
        sandboxValidate(obj.code as string).valid
      );
    });
  } catch (error) {
    console.error("Failed to parse extraction response:", error);
    return [];
  }
}

export async function extractStrategiesFromKeyIdeas(
  keyIdeas: string[],
  metadata: PaperMetadata
): Promise<ExtractedStrategy[]> {
  const ideaSummary = keyIdeas.map((idea, i) => `${i + 1}. ${idea}`).join("\n");

  const prompt = `Based on this research paper's key ideas, generate implementable trading strategies.

Paper: "${metadata.title}" by ${metadata.authors.join(", ")} (${metadata.year})

Key Ideas:
${ideaSummary}

Generate strategies that implement these ideas. Follow the exact JSON format with executable JavaScript code.

${EXTRACTION_PROMPT}`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  try {
    let jsonStr = content.text;
    const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      const startIdx = jsonStr.indexOf("{");
      const endIdx = jsonStr.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.slice(startIdx, endIdx + 1);
      }
    }

    const parsed = JSON.parse(jsonStr);
    const strategies = parsed.strategies;
    if (!Array.isArray(strategies)) return [];

    // Validate each strategy matches expected schema
    return strategies.filter((s: unknown): s is ExtractedStrategy => {
      if (!s || typeof s !== "object") return false;
      const obj = s as Record<string, unknown>;
      return (
        typeof obj.name === "string" &&
        typeof obj.code === "string" &&
        typeof obj.description === "string" &&
        typeof obj.confidence === "number" &&
        obj.confidence >= 0 && obj.confidence <= 1 &&
        Array.isArray(obj.symbols) &&
        sandboxValidate(obj.code as string).valid
      );
    });
  } catch (error) {
    console.error("Failed to parse extraction response:", error);
    return [];
  }
}

/**
 * Validate extracted strategy code
 */
export function validateStrategyCode(code: string): {
  valid: boolean;
  error?: string;
} {
  // Check for required function
  if (!code.includes("generateSignal")) {
    return { valid: false, error: "Missing generateSignal function" };
  }

  // Check for return statement
  if (!code.includes("return")) {
    return { valid: false, error: "Missing return statement" };
  }

  // Validate via sandboxed compilation
  return sandboxValidate(code);
}

/**
 * Improve strategy code with Claude
 */
export async function improveStrategyCode(
  code: string,
  feedback: string
): Promise<string> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Improve this trading strategy code based on the feedback.

Current code:
\`\`\`javascript
${code}
\`\`\`

Feedback: ${feedback}

Return ONLY the improved code, no explanation. Keep the same generateSignal function signature.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type");
  }

  // Extract code from response
  const codeMatch = content.text.match(/```(?:javascript)?\s*([\s\S]*?)\s*```/);
  return codeMatch ? codeMatch[1].trim() : content.text.trim();
}
