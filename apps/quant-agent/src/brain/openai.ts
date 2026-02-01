import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ModelResponse {
  content: string;
  model: "openai";
  usage?: { input_tokens: number; output_tokens: number };
}

const SYSTEM_PROMPT = `You are an expert quantitative trading analyst and code generator working alongside another AI model (Claude) to develop profitable trading strategies.

Your role:
1. Generate precise, executable trading strategy code in JavaScript
2. Analyze market data and identify patterns
3. Critique strategies proposed by Claude - find logical errors or optimizations
4. Learn from past trade results and improve future strategies

Strategy code MUST follow this exact signature:
\`\`\`javascript
function generateSignal(data, position) {
  // data.close - array of closing prices (most recent last)
  // data.high - array of high prices
  // data.low - array of low prices  
  // data.open - array of opening prices
  // data.volume - array of volumes
  // position - { qty, avgEntryPrice, side } or null if no position
  
  // Your strategy logic here
  // Use helper functions: SMA(arr, period), EMA(arr, period), RSI(arr, period)
  
  return { 
    type: 'buy' | 'sell' | 'hold',
    confidence: 0.0 - 1.0,
    reason: 'explanation of signal'
  };
}
\`\`\`

When generating strategies:
- Write clean, efficient code
- Include proper null/edge case handling
- Use meaningful variable names
- Add comments explaining the logic
- Always include both entry AND exit conditions

You have access to learned patterns from past successful trades. Incorporate these into your strategies.`;

export async function askOpenAI(
  prompt: string,
  context?: { patterns?: string[]; marketData?: string }
): Promise<ModelResponse> {
  const contextStr = context
    ? `
LEARNED PATTERNS FROM PAST TRADES:
${context.patterns?.join("\n") || "None yet"}

CURRENT MARKET CONDITIONS:
${context.marketData || "Not provided"}

---
`
    : "";

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 4096,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: contextStr + prompt },
    ],
  });

  const content = response.choices[0]?.message?.content || "";

  return {
    content,
    model: "openai",
    usage: response.usage
      ? {
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
        }
      : undefined,
  };
}

export async function openaiCritique(
  strategy: string,
  context?: { patterns?: string[] }
): Promise<ModelResponse> {
  const prompt = `Please critique this trading strategy proposed by Claude. Look for:
1. Code bugs or logical errors
2. Edge cases not handled
3. Performance issues
4. Missing risk management
5. Suggested code improvements

STRATEGY TO CRITIQUE:
${strategy}

Provide specific, actionable feedback with corrected code if needed.`;

  return askOpenAI(prompt, context);
}

export async function openaiGenerateStrategy(
  requirements: string,
  context?: { patterns?: string[] }
): Promise<ModelResponse> {
  const prompt = `Generate a complete trading strategy based on these requirements:

${requirements}

IMPORTANT: 
- Output ONLY the JavaScript function code
- Follow the exact signature specified
- Include helper function calls (SMA, EMA, RSI) as needed
- Add clear comments
- Handle edge cases (not enough data, etc.)`;

  return askOpenAI(prompt, context);
}

export async function openaiAnalyzeResults(
  trades: { symbol: string; side: string; pnl: number; reasoning: string }[],
  currentPatterns: string[]
): Promise<ModelResponse> {
  const tradesStr = trades
    .map(
      (t) =>
        `${t.symbol} ${t.side}: ${t.pnl > 0 ? "+" : ""}${t.pnl.toFixed(2)} - ${t.reasoning}`
    )
    .join("\n");

  const prompt = `Analyze these recent trade results and extract learnings:

RECENT TRADES:
${tradesStr}

CURRENT LEARNED PATTERNS:
${currentPatterns.join("\n") || "None yet"}

Based on this analysis, provide:
1. Statistical patterns in wins vs losses
2. Code-level improvements for strategies
3. New patterns to add (with confidence scores 0-1)
4. Patterns to deprecate (low confidence)

Be specific and quantitative in your analysis.`;

  return askOpenAI(prompt);
}
