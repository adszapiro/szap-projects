import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export interface ModelResponse {
  content: string;
  model: "claude";
  usage?: { input_tokens: number; output_tokens: number };
}

const SYSTEM_PROMPT = `You are an expert quantitative trading analyst working alongside another AI model (GPT-4) to develop profitable trading strategies.

Your role:
1. Analyze market conditions and propose trading strategies
2. Generate strategy code in JavaScript that follows this signature:
   function generateSignal(data, position) {
     // data.close, data.high, data.low, data.open, data.volume - arrays of historical values
     // position - current position info or null
     // Return: { type: 'buy'|'sell'|'hold', confidence: 0-1, reason: string }
   }
3. Critique strategies proposed by GPT-4 - find flaws, biases, or improvements
4. Learn from past trade results and suggest adjustments
5. Be rigorous about risk management - always consider drawdown and position sizing

When generating strategies:
- Use technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands)
- Consider multiple timeframes and confirmation signals
- Include clear entry AND exit conditions
- Avoid overfitting to recent data

You have access to learned patterns from past successful trades. Use these to inform your decisions.`;

export async function askClaude(
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

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: contextStr + prompt,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  const content = textContent?.type === "text" ? textContent.text : "";

  return {
    content,
    model: "claude",
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
  };
}

export async function claudeCritique(
  strategy: string,
  context?: { patterns?: string[] }
): Promise<ModelResponse> {
  const prompt = `Please critique this trading strategy proposed by GPT-4. Look for:
1. Potential flaws or edge cases
2. Overfitting risks
3. Missing risk management
4. Market conditions where it would fail
5. Suggested improvements

STRATEGY TO CRITIQUE:
${strategy}

Provide specific, actionable feedback. If the strategy is fundamentally flawed, say so directly.`;

  return askClaude(prompt, context);
}

export async function claudeAnalyzeResults(
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

Based on this analysis:
1. What patterns led to wins?
2. What patterns led to losses?
3. What new patterns should we add to our knowledge base?
4. What patterns should have their confidence adjusted?

Format your learnings as specific, actionable patterns like:
"RSI divergence + volume spike = strong reversal signal (entry)"
"Avoid momentum trades in first 30 min of market open (timing)"`;

  return askClaude(prompt);
}
