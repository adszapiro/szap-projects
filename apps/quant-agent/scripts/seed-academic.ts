/**
 * Deploy Academic Research Strategies
 * 
 * Strategies based on peer-reviewed quant research papers:
 * 1. Jegadeesh-Titman (1993) - Cross-sectional momentum
 * 2. Moskowitz-Ooi-Pedersen (2012) - Time-series momentum
 * 3. Fama-French (2014) - 5-Factor model
 * 4. Cointegration Pairs Trading - Statistical arbitrage
 * 5. Ehsani-Linnainmaa (2025) - TS Efficient Factors
 * 6. Li-Yuan-Zhou (2024) - Systematic Risk Momentum
 * 7. TFT (2025) - Temporal Fusion Transformer
 * 8. BiLSTM+FinBERT (2024) - Sentiment fusion
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

// Import strategy code generators
import { getJTStrategyCode } from "../src/strategies/academic/jegadeesh-titman.js";
import { getTSMOMStrategyCode } from "../src/strategies/academic/time-series-mom.js";
import { getFFStrategyCode } from "../src/strategies/academic/fama-french.js";
import { getPairsStrategyCode } from "../src/strategies/academic/pairs-cointegration.js";
import { getTSEfficientStrategyCode } from "../src/strategies/academic/ts-efficient.js";
import { getSRMStrategyCode } from "../src/strategies/academic/systematic-risk-mom.js";
import { getTFTStrategyCode } from "../src/strategies/ml/temporal-fusion.js";
import { getSentimentStrategyCode } from "../src/strategies/ml/bilstm-sentiment.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface AcademicStrategy {
  name: string;
  description: string;
  paper: string;
  asset_class: "stock" | "crypto";
  symbols: string[];
  code: string;
}

const ACADEMIC_STRATEGIES: AcademicStrategy[] = [
  // STOCKS
  {
    name: "JT Momentum (SPY)",
    description: "Jegadeesh-Titman cross-sectional momentum - buy winners",
    paper: "Journal of Finance 1993",
    asset_class: "stock",
    symbols: ["SPY"],
    code: getJTStrategyCode(),
  },
  {
    name: "TSMOM Trend (QQQ)",
    description: "Moskowitz time-series momentum with vol scaling",
    paper: "JFE 2012",
    asset_class: "stock",
    symbols: ["QQQ"],
    code: getTSMOMStrategyCode(),
  },
  {
    name: "Fama-French Quality",
    description: "5-Factor model quality/profitability tilt",
    paper: "SSRN 2014",
    asset_class: "stock",
    symbols: ["SPY", "QQQ"],
    code: getFFStrategyCode(),
  },
  {
    name: "TS Efficient Factors",
    description: "Volatility-managed factors (64% higher Sharpe)",
    paper: "Ehsani-Linnainmaa 2025",
    asset_class: "stock",
    symbols: ["SPY", "IWM"],
    code: getTSEfficientStrategyCode(),
  },
  {
    name: "Beta Momentum",
    description: "Systematic risk momentum - strongest momentum effect",
    paper: "Li-Yuan-Zhou 2024",
    asset_class: "stock",
    symbols: ["QQQ", "IWM"],
    code: getSRMStrategyCode(),
  },
  
  // CRYPTO
  {
    name: "TSMOM Crypto",
    description: "Time-series momentum for BTC/ETH",
    paper: "JFE 2012 (adapted)",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD"],
    code: getTSMOMStrategyCode({ targetVolatility: 0.50 }),  // Higher vol target for crypto
  },
  {
    name: "Pairs BTC-ETH",
    description: "Cointegration-based pairs trading",
    paper: "Gatev et al. / Vidyamurthy",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD"],
    code: getPairsStrategyCode("ETH/USD"),
  },
  {
    name: "Pairs SOL-AVAX",
    description: "Cointegration pairs on alt-L1s",
    paper: "Gatev et al. / Vidyamurthy",
    asset_class: "crypto",
    symbols: ["SOL/USD", "AVAX/USD"],
    code: getPairsStrategyCode("AVAX/USD"),
  },
  {
    name: "TFT Crypto",
    description: "Temporal Fusion Transformer multi-feature",
    paper: "MDPI Systems 2025",
    asset_class: "crypto",
    symbols: ["BTC/USD", "ETH/USD", "SOL/USD"],
    code: getTFTStrategyCode(),
  },
  {
    name: "BiLSTM Sentiment BTC",
    description: "Sentiment + technical fusion (96.8% accuracy)",
    paper: "arXiv 2409.18895",
    asset_class: "crypto",
    symbols: ["BTC/USD"],
    code: getSentimentStrategyCode(),
  },
];

async function deployAcademicStrategies() {
  console.log("📚 DEPLOYING ACADEMIC RESEARCH STRATEGIES");
  console.log("==========================================\n");

  // Deactivate existing strategies
  const { error: deactivateError } = await supabase
    .from("strategies")
    .update({ status: "inactive" })
    .eq("status", "deployed");

  if (deactivateError) {
    console.log("Note: Could not deactivate existing strategies");
  } else {
    console.log("✓ Deactivated existing strategies\n");
  }

  let stockCount = 0;
  let cryptoCount = 0;

  console.log("📈 STOCK STRATEGIES:");
  console.log("--------------------");
  
  for (const strategy of ACADEMIC_STRATEGIES.filter(s => s.asset_class === "stock")) {
    const { error } = await supabase.from("strategies").insert({
      name: strategy.name,
      description: `${strategy.description} | Paper: ${strategy.paper}`,
      code: strategy.code.trim(),
      source_model: "academic",
      status: "deployed",
      asset_class: strategy.asset_class,
      symbols: strategy.symbols,
    });

    if (error) {
      console.log(`  ✗ ${strategy.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${strategy.name}`);
      console.log(`    Paper: ${strategy.paper}`);
      console.log(`    Symbols: ${strategy.symbols.join(", ")}`);
      stockCount++;
    }
  }

  console.log("\n🪙 CRYPTO STRATEGIES:");
  console.log("---------------------");
  
  for (const strategy of ACADEMIC_STRATEGIES.filter(s => s.asset_class === "crypto")) {
    const { error } = await supabase.from("strategies").insert({
      name: strategy.name,
      description: `${strategy.description} | Paper: ${strategy.paper}`,
      code: strategy.code.trim(),
      source_model: "academic",
      status: "deployed",
      asset_class: strategy.asset_class,
      symbols: strategy.symbols,
    });

    if (error) {
      console.log(`  ✗ ${strategy.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${strategy.name}`);
      console.log(`    Paper: ${strategy.paper}`);
      console.log(`    Symbols: ${strategy.symbols.join(", ")}`);
      cryptoCount++;
    }
  }

  console.log("\n==========================================");
  console.log(`📊 DEPLOYED: ${stockCount} stock + ${cryptoCount} crypto = ${stockCount + cryptoCount} academic strategies`);
  console.log("\nResearch papers implemented:");
  console.log("  • Jegadeesh & Titman (1993) - Cross-sectional momentum");
  console.log("  • Moskowitz, Ooi & Pedersen (2012) - Time-series momentum");
  console.log("  • Fama & French (2014) - 5-Factor model");
  console.log("  • Gatev et al. - Pairs trading with cointegration");
  console.log("  • Ehsani & Linnainmaa (2025) - TS Efficient Factors");
  console.log("  • Li, Yuan & Zhou (2024) - Systematic Risk Momentum");
  console.log("  • MDPI Systems (2025) - Temporal Fusion Transformer");
  console.log("  • arXiv 2409.18895 (2024) - BiLSTM + FinBERT Sentiment");
}

deployAcademicStrategies().catch(console.error);
