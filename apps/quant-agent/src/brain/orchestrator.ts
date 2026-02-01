import { askClaude, claudeCritique, claudeAnalyzeResults } from "./claude.js";
import { askOpenAI, openaiCritique, openaiGenerateStrategy, openaiAnalyzeResults } from "./openai.js";
import { getTopPatterns, saveDebate, saveLearning } from "../db.js";
import { v4 as uuidv4 } from "uuid";

export interface DebateResult {
  sessionId: string;
  claudeProposal: string;
  openaiProposal: string;
  claudeCritique: string;
  openaiCritique: string;
  consensus: string;
  finalStrategy: string | null;
}

export interface StrategyProposal {
  name: string;
  description: string;
  code: string;
  sourceModel: "claude" | "openai" | "consensus";
  confidence: number;
}

/**
 * Main debate protocol between Claude and OpenAI
 * 1. Both models propose strategies
 * 2. Each critiques the other's proposal
 * 3. Models synthesize feedback into consensus
 * 4. Final strategy extracted
 */
export async function debateStrategy(
  requirements: string,
  marketContext?: string
): Promise<DebateResult> {
  const sessionId = uuidv4();
  const patterns = await getTopPatterns(10);
  const patternStrs = patterns.map((p) => `[${p.confidence.toFixed(2)}] ${p.pattern}`);

  console.log(`[Debate ${sessionId.slice(0, 8)}] Starting strategy debate...`);

  // Step 1: Both models propose strategies
  const [claudeResponse, openaiResponse] = await Promise.all([
    askClaude(
      `Propose a trading strategy for: ${requirements}`,
      { patterns: patternStrs, marketData: marketContext }
    ),
    openaiGenerateStrategy(requirements, { patterns: patternStrs }),
  ]);

  await saveDebate(sessionId, "claude", claudeResponse.content);
  await saveDebate(sessionId, "openai", openaiResponse.content);

  console.log(`[Debate ${sessionId.slice(0, 8)}] Both models proposed. Starting critiques...`);

  // Step 2: Each model critiques the other
  const [claudeCritiqueResp, openaiCritiqueResp] = await Promise.all([
    claudeCritique(openaiResponse.content, { patterns: patternStrs }),
    openaiCritique(claudeResponse.content, { patterns: patternStrs }),
  ]);

  await saveDebate(sessionId, "claude", `CRITIQUE OF OPENAI:\n${claudeCritiqueResp.content}`);
  await saveDebate(sessionId, "openai", `CRITIQUE OF CLAUDE:\n${openaiCritiqueResp.content}`);

  console.log(`[Debate ${sessionId.slice(0, 8)}] Critiques complete. Synthesizing consensus...`);

  // Step 3: Synthesize into consensus (use OpenAI for final code generation)
  const consensusPrompt = `Based on this debate between two AI models, synthesize the best trading strategy:

CLAUDE'S PROPOSAL:
${claudeResponse.content}

OPENAI'S PROPOSAL:
${openaiResponse.content}

CLAUDE'S CRITIQUE OF OPENAI:
${claudeCritiqueResp.content}

OPENAI'S CRITIQUE OF CLAUDE:
${openaiCritiqueResp.content}

Create a final, optimized strategy that:
1. Takes the best ideas from both proposals
2. Addresses the critiques raised
3. Outputs clean, executable JavaScript code

Output ONLY the final JavaScript function code.`;

  const consensusResponse = await askOpenAI(consensusPrompt);
  await saveDebate(sessionId, "consensus", consensusResponse.content);

  // Extract code from response
  const codeMatch = consensusResponse.content.match(/```(?:javascript)?\n([\s\S]*?)```/);
  const finalStrategy = codeMatch ? codeMatch[1].trim() : null;

  console.log(`[Debate ${sessionId.slice(0, 8)}] Consensus reached. Strategy ${finalStrategy ? "extracted" : "failed to extract"}.`);

  return {
    sessionId,
    claudeProposal: claudeResponse.content,
    openaiProposal: openaiResponse.content,
    claudeCritique: claudeCritiqueResp.content,
    openaiCritique: openaiCritiqueResp.content,
    consensus: consensusResponse.content,
    finalStrategy,
  };
}

/**
 * Analyze trade results with both models and update child learnings
 */
export async function analyzeAndLearn(
  trades: { symbol: string; side: string; pnl: number; reasoning: string }[]
): Promise<void> {
  if (trades.length === 0) {
    console.log("[Learner] No trades to analyze");
    return;
  }

  const patterns = await getTopPatterns(20);
  const patternStrs = patterns.map((p) => p.pattern);

  console.log(`[Learner] Analyzing ${trades.length} trades with both models...`);

  // Both models analyze
  const [claudeAnalysis, openaiAnalysis] = await Promise.all([
    claudeAnalyzeResults(trades, patternStrs),
    openaiAnalyzeResults(trades, patternStrs),
  ]);

  // Extract learnings from both analyses
  const learnings = extractLearnings(claudeAnalysis.content, "claude");
  learnings.push(...extractLearnings(openaiAnalysis.content, "openai"));

  // Save new learnings
  for (const learning of learnings) {
    await saveLearning(learning);
  }

  console.log(`[Learner] Saved ${learnings.length} new learnings to child model`);
}

/**
 * Extract structured learnings from model analysis text
 */
function extractLearnings(
  text: string,
  source: "claude" | "openai"
): Array<{ pattern: string; context?: string; category?: string; confidence: number }> {
  const learnings: Array<{ pattern: string; context?: string; category?: string; confidence: number }> = [];

  // Look for patterns in quotes or after bullet points
  const patternRegex = /"([^"]+)"|•\s*(.+)|[-*]\s*(.+)/g;
  let match;

  while ((match = patternRegex.exec(text)) !== null) {
    const pattern = match[1] || match[2] || match[3];
    if (pattern && pattern.length > 20 && pattern.length < 200) {
      // Determine category based on keywords
      let category = "general";
      if (/entry|buy|long/i.test(pattern)) category = "entry";
      else if (/exit|sell|close/i.test(pattern)) category = "exit";
      else if (/risk|stop|loss|drawdown/i.test(pattern)) category = "risk";
      else if (/timing|hour|day|open|close/i.test(pattern)) category = "timing";
      else if (/RSI|SMA|EMA|MACD|volume/i.test(pattern)) category = "indicator";

      learnings.push({
        pattern: pattern.trim(),
        category,
        confidence: 0.5, // Start at neutral, will be adjusted by trade results
      });
    }
  }

  return learnings;
}

/**
 * Quick consensus check - ask both models if a strategy is good
 */
export async function validateStrategy(strategyCode: string): Promise<{
  approved: boolean;
  claudeScore: number;
  openaiScore: number;
  concerns: string[];
}> {
  const prompt = `Rate this trading strategy on a scale of 0-10 and list any concerns:

${strategyCode}

Respond in this exact format:
SCORE: [0-10]
CONCERNS: [list each concern on new line, or "None"]`;

  const [claudeResp, openaiResp] = await Promise.all([
    askClaude(prompt),
    askOpenAI(prompt),
  ]);

  const extractScore = (text: string): number => {
    const match = text.match(/SCORE:\s*(\d+)/i);
    return match ? parseInt(match[1]) : 5;
  };

  const extractConcerns = (text: string): string[] => {
    const match = text.match(/CONCERNS:\s*([\s\S]*?)(?:$|\n\n)/i);
    if (!match || match[1].toLowerCase().includes("none")) return [];
    return match[1].split("\n").filter((c) => c.trim().length > 0);
  };

  const claudeScore = extractScore(claudeResp.content);
  const openaiScore = extractScore(openaiResp.content);
  const concerns = [
    ...extractConcerns(claudeResp.content),
    ...extractConcerns(openaiResp.content),
  ];

  return {
    approved: claudeScore >= 7 && openaiScore >= 7,
    claudeScore,
    openaiScore,
    concerns,
  };
}
