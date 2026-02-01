import { NextRequest, NextResponse } from "next/server";
import { analyzeWallet, isValidEthAddress } from "@/lib/blockchain";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!isValidEthAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address format" },
        { status: 400 }
      );
    }

    const analysis = await analyzeWallet(address);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Wallet analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze wallet" },
      { status: 500 }
    );
  }
}
