// Alpaca Paper Trading API Client
// All API calls are server-side only to protect API keys

export interface AlpacaCredentials {
  apiKey: string;
  secretKey: string;
  paper: boolean;
}

export interface Account {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: number;
  portfolio_value: number;
  buying_power: number;
  equity: number;
  last_equity: number;
  daytrade_count: number;
  pattern_day_trader: boolean;
}

export interface Position {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: number;
  qty: number;
  side: "long" | "short";
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  unrealized_intraday_pl: number;
  unrealized_intraday_plpc: number;
  current_price: number;
  lastday_price: number;
  change_today: number;
}

export interface Order {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  symbol: string;
  qty: number;
  filled_qty: number;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit";
  time_in_force: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok";
  limit_price: number | null;
  stop_price: number | null;
  filled_avg_price: number | null;
  status: string;
}

export interface OrderRequest {
  symbol: string;
  qty: number;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit";
  time_in_force: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok";
  limit_price?: number;
  stop_price?: number;
}

export interface Bar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

// Get base URL based on paper/live
function getBaseUrl(paper: boolean = true): string {
  return paper
    ? "https://paper-api.alpaca.markets"
    : "https://api.alpaca.markets";
}

function getDataUrl(): string {
  return "https://data.alpaca.markets";
}

// Make authenticated request to Alpaca
async function alpacaRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey: string;
    secretKey: string;
    paper?: boolean;
    isData?: boolean;
  }
): Promise<T> {
  const { method = "GET", body, apiKey, secretKey, paper = true, isData = false } = options;
  
  const baseUrl = isData ? getDataUrl() : getBaseUrl(paper);
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "APCA-API-KEY-ID": apiKey,
      "APCA-API-SECRET-KEY": secretKey,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Alpaca API error: ${response.status} - ${error}`);
  }

  return response.json();
}

// Account endpoints
export async function getAccount(credentials: AlpacaCredentials): Promise<Account> {
  return alpacaRequest<Account>("/v2/account", {
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

// Positions endpoints
export async function getPositions(credentials: AlpacaCredentials): Promise<Position[]> {
  return alpacaRequest<Position[]>("/v2/positions", {
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

export async function getPosition(
  credentials: AlpacaCredentials,
  symbol: string
): Promise<Position> {
  return alpacaRequest<Position>(`/v2/positions/${symbol}`, {
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

export async function closePosition(
  credentials: AlpacaCredentials,
  symbol: string
): Promise<Order> {
  return alpacaRequest<Order>(`/v2/positions/${symbol}`, {
    method: "DELETE",
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

export async function closeAllPositions(credentials: AlpacaCredentials): Promise<Order[]> {
  return alpacaRequest<Order[]>("/v2/positions", {
    method: "DELETE",
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

// Orders endpoints
export async function getOrders(
  credentials: AlpacaCredentials,
  status: "open" | "closed" | "all" = "open"
): Promise<Order[]> {
  return alpacaRequest<Order[]>(`/v2/orders?status=${status}`, {
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

export async function createOrder(
  credentials: AlpacaCredentials,
  order: OrderRequest
): Promise<Order> {
  return alpacaRequest<Order>("/v2/orders", {
    method: "POST",
    body: order,
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

export async function cancelOrder(
  credentials: AlpacaCredentials,
  orderId: string
): Promise<void> {
  await alpacaRequest<void>(`/v2/orders/${orderId}`, {
    method: "DELETE",
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

export async function cancelAllOrders(credentials: AlpacaCredentials): Promise<void> {
  await alpacaRequest<void>("/v2/orders", {
    method: "DELETE",
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
  });
}

// Market data endpoints
export async function getBars(
  credentials: AlpacaCredentials,
  symbol: string,
  timeframe: string = "1Day",
  start?: string,
  end?: string,
  limit: number = 100
): Promise<{ bars: Bar[] }> {
  let endpoint = `/v2/stocks/${symbol}/bars?timeframe=${timeframe}&limit=${limit}`;
  if (start) endpoint += `&start=${start}`;
  if (end) endpoint += `&end=${end}`;

  return alpacaRequest<{ bars: Bar[] }>(endpoint, {
    apiKey: credentials.apiKey,
    secretKey: credentials.secretKey,
    paper: credentials.paper,
    isData: true,
  });
}

export async function getLatestTrade(
  credentials: AlpacaCredentials,
  symbol: string
): Promise<{ trade: { p: number; s: number; t: string } }> {
  return alpacaRequest<{ trade: { p: number; s: number; t: string } }>(
    `/v2/stocks/${symbol}/trades/latest`,
    {
      apiKey: credentials.apiKey,
      secretKey: credentials.secretKey,
      paper: credentials.paper,
      isData: true,
    }
  );
}

// Clock and calendar
export async function getClock(
  credentials: AlpacaCredentials
): Promise<{ is_open: boolean; next_open: string; next_close: string }> {
  return alpacaRequest<{ is_open: boolean; next_open: string; next_close: string }>(
    "/v2/clock",
    {
      apiKey: credentials.apiKey,
      secretKey: credentials.secretKey,
      paper: credentials.paper,
    }
  );
}
