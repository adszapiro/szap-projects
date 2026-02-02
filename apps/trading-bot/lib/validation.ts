/**
 * Input validation utilities for trading API routes
 */

// Stock symbol regex: 1-5 uppercase letters
const STOCK_SYMBOL_REGEX = /^[A-Z]{1,5}$/;

// Crypto symbol regex: e.g., BTC/USD, ETH/USD
const CRYPTO_SYMBOL_REGEX = /^[A-Z]{2,10}\/USD$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a stock or crypto symbol
 */
export function validateSymbol(symbol: unknown): ValidationResult {
  if (typeof symbol !== "string") {
    return { valid: false, error: "Symbol must be a string" };
  }

  const upperSymbol = symbol.toUpperCase().trim();

  if (upperSymbol.length === 0) {
    return { valid: false, error: "Symbol cannot be empty" };
  }

  if (upperSymbol.length > 10) {
    return { valid: false, error: "Symbol too long (max 10 characters)" };
  }

  // Check if it's a valid stock or crypto symbol
  if (!STOCK_SYMBOL_REGEX.test(upperSymbol) && !CRYPTO_SYMBOL_REGEX.test(upperSymbol)) {
    return { valid: false, error: "Invalid symbol format. Use stock ticker (e.g., AAPL) or crypto pair (e.g., BTC/USD)" };
  }

  return { valid: true };
}

/**
 * Validate order quantity
 */
export function validateQuantity(qty: unknown): ValidationResult {
  if (qty === undefined || qty === null) {
    return { valid: false, error: "Quantity is required" };
  }

  const numQty = Number(qty);

  if (isNaN(numQty)) {
    return { valid: false, error: "Quantity must be a number" };
  }

  if (numQty <= 0) {
    return { valid: false, error: "Quantity must be positive" };
  }

  if (numQty > 100000) {
    return { valid: false, error: "Quantity exceeds maximum limit (100,000)" };
  }

  if (!Number.isInteger(numQty) && numQty < 1) {
    return { valid: false, error: "Fractional shares must be at least 1 or a whole number" };
  }

  return { valid: true };
}

/**
 * Validate order side (buy/sell)
 */
export function validateSide(side: unknown): ValidationResult {
  if (typeof side !== "string") {
    return { valid: false, error: "Side must be a string" };
  }

  const lowerSide = side.toLowerCase();
  if (lowerSide !== "buy" && lowerSide !== "sell") {
    return { valid: false, error: "Side must be 'buy' or 'sell'" };
  }

  return { valid: true };
}

/**
 * Validate order type
 */
export function validateOrderType(type: unknown): ValidationResult {
  if (typeof type !== "string") {
    return { valid: false, error: "Order type must be a string" };
  }

  const validTypes = ["market", "limit", "stop", "stop_limit"];
  if (!validTypes.includes(type.toLowerCase())) {
    return { valid: false, error: `Order type must be one of: ${validTypes.join(", ")}` };
  }

  return { valid: true };
}

/**
 * Validate price (for limit/stop orders)
 */
export function validatePrice(price: unknown, required: boolean = false): ValidationResult {
  if (price === undefined || price === null) {
    if (required) {
      return { valid: false, error: "Price is required for this order type" };
    }
    return { valid: true };
  }

  const numPrice = Number(price);

  if (isNaN(numPrice)) {
    return { valid: false, error: "Price must be a number" };
  }

  if (numPrice <= 0) {
    return { valid: false, error: "Price must be positive" };
  }

  if (numPrice > 1000000) {
    return { valid: false, error: "Price exceeds maximum limit ($1,000,000)" };
  }

  return { valid: true };
}

/**
 * Validate percentage (for percentage-based trades)
 */
export function validatePercentage(percent: unknown): ValidationResult {
  if (percent === undefined || percent === null) {
    return { valid: true }; // Optional field
  }

  const numPercent = Number(percent);

  if (isNaN(numPercent)) {
    return { valid: false, error: "Percentage must be a number" };
  }

  if (numPercent <= 0 || numPercent > 100) {
    return { valid: false, error: "Percentage must be between 0 and 100" };
  }

  return { valid: true };
}

/**
 * Validate dollar amount
 */
export function validateDollarAmount(amount: unknown): ValidationResult {
  if (amount === undefined || amount === null) {
    return { valid: true }; // Optional field
  }

  const numAmount = Number(amount);

  if (isNaN(numAmount)) {
    return { valid: false, error: "Dollar amount must be a number" };
  }

  if (numAmount <= 0) {
    return { valid: false, error: "Dollar amount must be positive" };
  }

  if (numAmount > 10000000) {
    return { valid: false, error: "Dollar amount exceeds maximum limit ($10,000,000)" };
  }

  return { valid: true };
}

/**
 * Sanitize a symbol input
 */
export function sanitizeSymbol(symbol: string): string {
  return symbol.toUpperCase().trim().replace(/[^A-Z/]/g, "");
}
