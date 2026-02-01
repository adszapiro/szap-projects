import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseInstance: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

export interface CachedPriceData {
  id?: number;
  symbol: string;
  asset_type: "stock" | "crypto";
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  cached_at?: string;
}

// Check if we have cached data for a symbol
export async function getCachedData(
  symbol: string,
  assetType: "stock" | "crypto",
  startDate: string,
  endDate: string
): Promise<CachedPriceData[] | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null; // Supabase not configured
  }

  try {
    const { data, error } = await supabase
      .from("price_cache")
      .select("*")
      .eq("symbol", symbol.toLowerCase())
      .eq("asset_type", assetType)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// Cache price data in Supabase
export async function cacheData(
  symbol: string,
  assetType: "stock" | "crypto",
  data: CachedPriceData[]
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    return; // Supabase not configured
  }

  try {
    const dataToInsert = data.map((d) => ({
      symbol: symbol.toLowerCase(),
      asset_type: assetType,
      date: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
      cached_at: new Date().toISOString(),
    }));

    // Upsert to handle duplicates
    await supabase.from("price_cache").upsert(dataToInsert, {
      onConflict: "symbol,date",
      ignoreDuplicates: true,
    });
  } catch {
    // Silently fail - caching is optional
  }
}
