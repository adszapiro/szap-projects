import { NextRequest, NextResponse } from "next/server";
import {
  getUser,
  getRepos,
  getEvents,
  generateContributions,
  calculateStreak,
  getLanguageStats,
} from "@/lib/github";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    // Fetch all data in parallel
    const [user, repos, events] = await Promise.all([
      getUser(username),
      getRepos(username),
      getEvents(username),
    ]);

    // Process the data
    const contributions = generateContributions(events);
    const streak = calculateStreak(contributions);
    const languages = getLanguageStats(repos);
    const totalContributions = contributions.reduce((sum, d) => sum + d.count, 0);

    return NextResponse.json({
      user,
      repos,
      contributions,
      streak,
      languages,
      totalContributions,
    });
  } catch (error) {
    console.error("GitHub API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch GitHub data" },
      { status: 500 }
    );
  }
}
