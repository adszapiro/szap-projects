/**
 * Research Paper Types
 */

export interface PaperMetadata {
  title: string;
  authors: string[];
  year: number;
  source: PaperSource;
  abstract?: string;
  keywords?: string[];
}

export type PaperSource = 
  | "SSRN"
  | "arXiv"
  | "JoF"      // Journal of Finance
  | "JFE"      // Journal of Financial Economics
  | "RFS"      // Review of Financial Studies
  | "MDPI"
  | "other";

export interface ExtractedStrategy {
  name: string;
  description: string;
  assetClass: "stock" | "crypto" | "both";
  symbols: string[];
  keyInsights: string[];
  tradingLogic: string;  // Natural language description
  code: string;          // Generated TypeScript/JS code
  confidence: number;    // How confident the extraction is (0-1)
}

export interface PaperExtractionResult {
  paperId: string;
  metadata: PaperMetadata;
  strategies: ExtractedStrategy[];
  rawText?: string;
  extractionDate: Date;
}

export interface PaperAddRequest {
  url?: string;
  file?: Buffer;
  title?: string;
  authors?: string[];
  year?: number;
  source?: PaperSource;
}

export const KNOWN_PAPERS: Array<{
  title: string;
  authors: string[];
  year: number;
  source: PaperSource;
  url?: string;
  keyIdeas: string[];
}> = [
  {
    title: "Returns to Buying Winners and Selling Losers",
    authors: ["Jegadeesh", "Titman"],
    year: 1993,
    source: "JoF",
    keyIdeas: [
      "Cross-sectional momentum: buy recent winners, sell losers",
      "3-12 month lookback periods work best",
      "Skip most recent month to avoid reversal",
    ],
  },
  {
    title: "Time Series Momentum",
    authors: ["Moskowitz", "Ooi", "Pedersen"],
    year: 2012,
    source: "JFE",
    keyIdeas: [
      "Asset's own past return predicts future return",
      "Works across asset classes and time periods",
      "Scale positions by inverse volatility",
    ],
  },
  {
    title: "A Five-Factor Asset Pricing Model",
    authors: ["Fama", "French"],
    year: 2014,
    source: "SSRN",
    keyIdeas: [
      "5 factors: Market, Size, Value, Profitability, Investment",
      "Quality (profitability) factor adds explanatory power",
      "Factor tilts can improve risk-adjusted returns",
    ],
  },
  {
    title: "Pairs Trading: Quantitative Methods and Analysis",
    authors: ["Vidyamurthy"],
    year: 2004,
    source: "other",
    keyIdeas: [
      "Find cointegrated pairs with shared equilibrium",
      "Trade mean reversion of spread",
      "Entry at 2 std devs, exit at 0.5 std devs",
    ],
  },
  {
    title: "Time-Series Efficient Factors",
    authors: ["Ehsani", "Linnainmaa"],
    year: 2025,
    source: "SSRN",
    keyIdeas: [
      "Apply momentum to factors themselves",
      "Scale factor exposure by inverse volatility",
      "64% higher Sharpe than traditional factors",
    ],
  },
  {
    title: "Systematic Risk Momentum",
    authors: ["Li", "Yuan", "Zhou"],
    year: 2024,
    source: "SSRN",
    keyIdeas: [
      "Momentum in beta, not just returns",
      "Rising-beta assets outperform",
      "Strongest momentum effect discovered",
    ],
  },
  {
    title: "Temporal Fusion Transformer for Crypto Trading",
    authors: ["Various"],
    year: 2025,
    source: "MDPI",
    keyIdeas: [
      "Combine on-chain and technical indicators",
      "Multi-step ahead forecasting",
      "Attention mechanism for feature importance",
    ],
  },
  {
    title: "BiLSTM + FinBERT Sentiment Fusion for Bitcoin",
    authors: ["Various"],
    year: 2024,
    source: "arXiv",
    keyIdeas: [
      "Fuse Twitter sentiment with technical analysis",
      "FinBERT for financial sentiment extraction",
      "96.8% directional accuracy claimed",
    ],
  },
];
