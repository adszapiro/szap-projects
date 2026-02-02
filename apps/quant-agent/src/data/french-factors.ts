/**
 * Fama-French Factor Data Fetcher
 * 
 * Fetches factor returns from Kenneth French's Data Library
 * https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/data_library.html
 * 
 * The 5 factors are:
 * - Mkt-RF: Market excess return
 * - SMB: Small minus Big (size factor)
 * - HML: High minus Low (value factor)
 * - RMW: Robust minus Weak (profitability factor)
 * - CMA: Conservative minus Aggressive (investment factor)
 */

export interface FamaFrenchFactors {
  date: string;
  mktRf: number;   // Market excess return
  smb: number;     // Size factor
  hml: number;     // Value factor
  rmw: number;     // Profitability factor
  cma: number;     // Investment factor
  rf: number;      // Risk-free rate
}

export interface FactorExposures {
  beta: number;    // Market beta
  size: number;    // Size tilt (-1 = large cap, +1 = small cap)
  value: number;   // Value tilt (-1 = growth, +1 = value)
  quality: number; // Quality tilt (-1 = weak, +1 = robust profitability)
  investment: number; // Investment tilt (-1 = aggressive, +1 = conservative)
}

// ETF proxies for factor tilts (for implementation)
export const FACTOR_ETFS = {
  // Market
  market: "SPY",
  
  // Size
  smallCap: "IWM",    // iShares Russell 2000
  largeCap: "SPY",    // S&P 500
  
  // Value/Growth
  value: "IWD",       // iShares Russell 1000 Value
  growth: "IWF",      // iShares Russell 1000 Growth
  
  // Quality/Profitability
  quality: "QUAL",    // iShares MSCI USA Quality Factor
  
  // Low Volatility (related to investment factor)
  lowVol: "USMV",     // iShares MSCI USA Min Vol Factor
  
  // Momentum (related, from Carhart 4-factor)
  momentum: "MTUM",   // iShares MSCI USA Momentum Factor
};

// Historical factor data (simplified - in production, fetch from French library)
// These are approximate average daily factor returns (annualized basis points)
export const HISTORICAL_FACTOR_PREMIUMS = {
  mktRf: 0.06,    // ~6% market risk premium
  smb: 0.02,      // ~2% size premium
  hml: 0.03,      // ~3% value premium
  rmw: 0.03,      // ~3% profitability premium
  cma: 0.03,      // ~3% investment premium
};

/**
 * Parse CSV data from French library (simplified parser)
 */
function parseFrenchCSV(csvData: string): FamaFrenchFactors[] {
  const lines = csvData.trim().split("\n");
  const factors: FamaFrenchFactors[] = [];
  
  // Skip header lines (French data has specific format)
  let dataStarted = false;
  
  for (const line of lines) {
    const parts = line.split(",").map(p => p.trim());
    
    // Look for date format YYYYMM
    if (parts[0] && /^\d{6}$/.test(parts[0])) {
      dataStarted = true;
      
      if (parts.length >= 6) {
        factors.push({
          date: parts[0],
          mktRf: parseFloat(parts[1]) / 100,  // Convert from percentage
          smb: parseFloat(parts[2]) / 100,
          hml: parseFloat(parts[3]) / 100,
          rmw: parts[4] ? parseFloat(parts[4]) / 100 : 0,
          cma: parts[5] ? parseFloat(parts[5]) / 100 : 0,
          rf: parts[6] ? parseFloat(parts[6]) / 100 : 0,
        });
      }
    }
  }
  
  return factors;
}

/**
 * Fetch Fama-French 5 factors from the data library
 * Note: The actual French library requires specific URL formatting
 * This is a simplified version that would need the actual data file
 */
export async function fetchFamaFrenchFactors(): Promise<FamaFrenchFactors[]> {
  // In production, fetch from:
  // https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_5_Factors_2x3_daily_CSV.zip
  
  // For now, return simulated recent data based on historical averages
  const factors: FamaFrenchFactors[] = [];
  const today = new Date();
  
  // Generate 252 days of simulated factor data
  for (let i = 252; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    
    // Simulate daily returns with realistic volatility
    factors.push({
      date: dateStr,
      mktRf: (Math.random() - 0.48) * 0.02,      // ~2% daily std, slight positive drift
      smb: (Math.random() - 0.5) * 0.01,         // ~1% daily std
      hml: (Math.random() - 0.5) * 0.01,
      rmw: (Math.random() - 0.5) * 0.008,
      cma: (Math.random() - 0.5) * 0.008,
      rf: 0.0002,                                  // ~5% annual risk-free
    });
  }
  
  return factors;
}

/**
 * Calculate factor exposures from regression
 * (Simplified - returns heuristic based on ETF type)
 */
export function estimateFactorExposures(symbol: string): FactorExposures {
  // Default market exposure
  const defaults: FactorExposures = {
    beta: 1.0,
    size: 0,
    value: 0,
    quality: 0,
    investment: 0,
  };
  
  // Heuristic factor tilts based on common ETFs
  const exposures: Record<string, Partial<FactorExposures>> = {
    "SPY": { beta: 1.0, size: 0.1, value: 0 },
    "QQQ": { beta: 1.1, size: 0.2, value: -0.3 },  // Tech/growth
    "IWM": { beta: 1.2, size: 0.8, value: 0.1 },   // Small cap
    "IWD": { beta: 0.9, size: 0, value: 0.7 },     // Value
    "IWF": { beta: 1.1, size: 0, value: -0.7 },    // Growth
    "QUAL": { beta: 0.9, quality: 0.8 },
    "MTUM": { beta: 1.0, quality: 0.2 },
    "USMV": { beta: 0.7, investment: 0.5 },
  };
  
  return { ...defaults, ...exposures[symbol] };
}

/**
 * Calculate expected return based on factor model
 */
export function expectedFactorReturn(
  exposures: FactorExposures,
  factorPremiums: typeof HISTORICAL_FACTOR_PREMIUMS = HISTORICAL_FACTOR_PREMIUMS
): number {
  return (
    exposures.beta * factorPremiums.mktRf +
    exposures.size * factorPremiums.smb +
    exposures.value * factorPremiums.hml +
    exposures.quality * factorPremiums.rmw +
    exposures.investment * factorPremiums.cma
  );
}

/**
 * Get current factor momentum (which factors are performing well)
 */
export function getFactorMomentum(
  factors: FamaFrenchFactors[],
  lookback: number = 60
): Record<string, number> {
  const recent = factors.slice(-lookback);
  
  if (recent.length === 0) {
    return { mktRf: 0, smb: 0, hml: 0, rmw: 0, cma: 0 };
  }
  
  return {
    mktRf: recent.reduce((sum, f) => sum + f.mktRf, 0),
    smb: recent.reduce((sum, f) => sum + f.smb, 0),
    hml: recent.reduce((sum, f) => sum + f.hml, 0),
    rmw: recent.reduce((sum, f) => sum + f.rmw, 0),
    cma: recent.reduce((sum, f) => sum + f.cma, 0),
  };
}
