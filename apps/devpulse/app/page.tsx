"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Github,
  Search,
  GitFork,
  Star,
  Users,
  Calendar,
  Flame,
  Code,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
}

interface GitHubRepo {
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface DashboardData {
  user: GitHubUser;
  repos: GitHubRepo[];
  contributions: ContributionDay[];
  streak: { current: number; longest: number };
  languages: { language: string; count: number; color: string }[];
  totalContributions: number;
}

export default function Home() {
  const [username, setUsername] = useState("adszapiro");
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (user?: string) => {
    const targetUser = user || username;
    if (!targetUser.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(targetUser)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to fetch data");
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  // Auto-load default user on mount
  useEffect(() => {
    fetchData("adszapiro");
  }, []);

  const getContribColor = (level: number) => {
    const colors = [
      "bg-[#161b22]",
      "bg-[#0e4429]",
      "bg-[#006d32]",
      "bg-[#26a641]",
      "bg-[#39d353]",
    ];
    return colors[level] || colors[0];
  };

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <header className="border-b border-[#30363d] bg-[#161b22]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="w-8 h-8 text-white" />
            <div>
              <h1 className="text-xl font-bold text-white">DevPulse</h1>
              <p className="text-xs text-[#8b949e]">GitHub Activity Dashboard</p>
            </div>
          </div>
          <a
            href="https://alexszapiro.com"
            className="text-sm text-[#8b949e] hover:text-white transition-colors"
          >
            Back to Portfolio
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b949e]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
                placeholder="Enter GitHub username"
                className="w-full pl-10 pr-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-[#8b949e] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] outline-none"
              />
            </div>
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="px-6 py-3 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Analyze"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-[#490202] border border-[#f85149] rounded-lg flex items-center gap-3 text-[#f85149]">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Dashboard */}
        {data && (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
              <div className="flex items-start gap-6">
                <img
                  src={data.user.avatar_url}
                  alt={data.user.name}
                  className="w-24 h-24 rounded-full border-2 border-[#30363d]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{data.user.name}</h2>
                    <a
                      href={data.user.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#58a6ff] hover:underline flex items-center gap-1"
                    >
                      @{data.user.login}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-[#8b949e] mb-4">{data.user.bio}</p>
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-1 text-[#8b949e]">
                      <Code className="w-4 h-4" />
                      <span className="text-white font-medium">{data.user.public_repos}</span> repos
                    </div>
                    <div className="flex items-center gap-1 text-[#8b949e]">
                      <Users className="w-4 h-4" />
                      <span className="text-white font-medium">{data.user.followers}</span> followers
                    </div>
                    <div className="flex items-center gap-1 text-[#8b949e]">
                      <Calendar className="w-4 h-4" />
                      Joined {new Date(data.user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#8b949e] mb-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Current Streak</span>
                </div>
                <p className="text-3xl font-bold text-white">{data.streak.current} days</p>
              </div>
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#8b949e] mb-2">
                  <Flame className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Longest Streak</span>
                </div>
                <p className="text-3xl font-bold text-white">{data.streak.longest} days</p>
              </div>
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#8b949e] mb-2">
                  <Github className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Total Contributions</span>
                </div>
                <p className="text-3xl font-bold text-white">{data.totalContributions}</p>
              </div>
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[#8b949e] mb-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Total Stars</span>
                </div>
                <p className="text-3xl font-bold text-white">
                  {data.repos.reduce((sum, r) => sum + r.stargazers_count, 0)}
                </p>
              </div>
            </div>

            {/* Contribution Graph */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Contribution Activity</h3>
              <div className="overflow-x-auto">
                <div className="flex gap-1" style={{ width: "max-content" }}>
                  {Array.from({ length: 52 }).map((_, weekIdx) => (
                    <div key={weekIdx} className="flex flex-col gap-1">
                      {Array.from({ length: 7 }).map((_, dayIdx) => {
                        const idx = weekIdx * 7 + dayIdx;
                        const day = data.contributions[idx];
                        if (!day) return null;
                        return (
                          <div
                            key={dayIdx}
                            className={`w-3 h-3 rounded-sm ${getContribColor(day.level)}`}
                            title={`${day.date}: ${day.count} contributions`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-[#8b949e]">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div key={level} className={`w-3 h-3 rounded-sm ${getContribColor(level)}`} />
                ))}
                <span>More</span>
              </div>
            </div>

            {/* Languages & Repos */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Languages */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Languages</h3>
                <div className="space-y-3">
                  {data.languages.slice(0, 5).map((lang) => (
                    <div key={lang.language} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: lang.color }}
                      />
                      <span className="text-white flex-1">{lang.language}</span>
                      <span className="text-[#8b949e]">{lang.count} repos</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Repos */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Repositories</h3>
                <div className="space-y-3">
                  {data.repos.slice(0, 5).map((repo) => (
                    <a
                      key={repo.name}
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-[#0d1117] rounded-lg hover:bg-[#21262d] transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Code className="w-4 h-4 text-[#58a6ff]" />
                        <span className="text-[#58a6ff] font-medium">{repo.name}</span>
                      </div>
                      <p className="text-sm text-[#8b949e] line-clamp-1">{repo.description || "No description"}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#8b949e]">
                        {repo.language && (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#3178c6]" />
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {repo.stargazers_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" />
                          {repo.forks_count}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!data && !isLoading && !error && (
          <div className="text-center py-16">
            <Github className="w-16 h-16 text-[#30363d] mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Analyze any GitHub profile</h2>
            <p className="text-[#8b949e]">Enter a username to see their contribution stats, streaks, and activity.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#30363d] mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-[#8b949e] text-sm">
          Built by Alex Szapiro |{" "}
          <a href="https://alexszapiro.com" className="text-[#58a6ff] hover:underline">
            Portfolio
          </a>
        </div>
      </footer>
    </div>
  );
}
