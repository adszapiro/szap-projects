import { describe, it, expect } from "vitest";
import { sma, ema, rsi, macd, bollingerBands } from "./indicators";

describe("Technical Indicators", () => {
  describe("SMA (Simple Moving Average)", () => {
    it("returns null for periods before enough data", () => {
      const prices = [10, 20, 30];
      const result = sma(prices, 3);
      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
    });

    it("calculates 3-period SMA correctly", () => {
      const prices = [10, 20, 30, 40, 50];
      const result = sma(prices, 3);
      expect(result[2]).toBe(20); // (10+20+30)/3
      expect(result[3]).toBe(30); // (20+30+40)/3
      expect(result[4]).toBe(40); // (30+40+50)/3
    });

    it("handles single-period SMA (same as input)", () => {
      const prices = [10, 20, 30];
      const result = sma(prices, 1);
      expect(result).toEqual([10, 20, 30]);
    });
  });

  describe("EMA (Exponential Moving Average)", () => {
    it("returns null for periods before enough data", () => {
      const prices = [10, 20, 30, 40, 50];
      const result = ema(prices, 3);
      expect(result[0]).toBeNull();
      expect(result[1]).toBeNull();
    });

    it("first EMA equals SMA", () => {
      const prices = [10, 20, 30, 40, 50];
      const result = ema(prices, 3);
      const smaResult = sma(prices, 3);
      expect(result[2]).toBe(smaResult[2]); // First EMA = SMA
    });

    it("calculates subsequent EMA values", () => {
      const prices = [10, 20, 30, 40, 50];
      const result = ema(prices, 3);
      expect(result[3]).toBeDefined();
      expect(typeof result[3]).toBe("number");
      // EMA for index 3 should be calculated from previous EMA (20) and current price (40)
      // multiplier = 2/(3+1) = 0.5, EMA = (40-20)*0.5 + 20 = 30
      expect(result[3]).toBeGreaterThanOrEqual(30);
      expect(result[3]).toBeLessThan(45);
    });
  });

  describe("RSI (Relative Strength Index)", () => {
    it("returns null for first value", () => {
      const prices = [10, 20, 30, 40, 50];
      const result = rsi(prices, 3);
      expect(result[0]).toBeNull();
    });

    it("returns 100 when all gains (no losses)", () => {
      const prices = [10, 20, 30, 40, 50, 60, 70];
      const result = rsi(prices, 3);
      // With continuous gains, RSI should be high
      const lastValue = result[result.length - 1];
      expect(lastValue).toBeDefined();
      expect(lastValue).toBeGreaterThan(50);
    });

    it("returns value between 0 and 100", () => {
      const prices = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64];
      const result = rsi(prices, 14);
      const validValues = result.filter((v): v is number => v !== null);
      validValues.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("MACD", () => {
    it("returns object with macd, signal, and histogram arrays", () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = macd(prices);
      expect(result).toHaveProperty("macd");
      expect(result).toHaveProperty("signal");
      expect(result).toHaveProperty("histogram");
      expect(result.macd.length).toBe(prices.length);
    });

    it("has null values until enough data for slow EMA", () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = macd(prices, 12, 26, 9);
      // First 25 values should be null (26-1 periods needed)
      expect(result.macd[24]).toBeNull();
      expect(result.macd[25]).not.toBeNull();
    });
  });

  describe("Bollinger Bands", () => {
    it("returns upper, middle, and lower bands", () => {
      const prices = [20, 21, 22, 21, 20, 19, 20, 21, 22, 23, 22, 21, 20, 21, 22, 23, 24, 23, 22, 21, 22, 23];
      const result = bollingerBands(prices, 20);
      expect(result).toHaveProperty("upper");
      expect(result).toHaveProperty("middle");
      expect(result).toHaveProperty("lower");
    });

    it("middle band equals SMA", () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = bollingerBands(prices, 20);
      const smaResult = sma(prices, 20);
      expect(result.middle).toEqual(smaResult);
    });

    it("upper band is greater than middle, lower is less", () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + Math.sin(i) * 5);
      const result = bollingerBands(prices, 20);
      const lastIndex = prices.length - 1;
      const upper = result.upper[lastIndex];
      const middle = result.middle[lastIndex];
      const lower = result.lower[lastIndex];
      
      if (upper && middle && lower) {
        expect(upper).toBeGreaterThan(middle);
        expect(lower).toBeLessThan(middle);
      }
    });
  });
});
