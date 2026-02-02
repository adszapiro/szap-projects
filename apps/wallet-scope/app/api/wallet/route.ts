import { NextRequest, NextResponse } from "next/server";
import { analyzeWallet, isValidEthAddress } from "@/lib/blockchain";

const TIMEOUT_MS = 30000; // 30 second timeout

export async function POST(request: NextRequest) {
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const { address } = await request.json();

    if (!address) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (typeof address !== "string") {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "Wallet address must be a string" },
        { status: 400 }
      );
    }

    if (!isValidEthAddress(address)) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    const analysis = await analyzeWallet(address);
    clearTimeout(timeoutId);

    return NextResponse.json(analysis);
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle timeout specifically
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out. The blockchain may be slow. Please try again." },
        { status: 408 }
      );
    }

    console.error("Wallet analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze wallet" },
      { status: 500 }
    );
  }
}
