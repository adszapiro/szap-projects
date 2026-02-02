"use client";

import { useState, useEffect, useCallback } from "react";

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

  useEffect(() => {
    fetchData("adszapiro");
  }, []);

  const getContribColor = (level: number) => {
    const colors = ["bg-gray-100", "bg-green-200", "bg-green-300", "bg-green-500", "bg-green-700"];
    return colors[level] || colors[0];
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-black">DevPulse</h1>
            <p className="text-sm text-gray-500">GitHub profile analyzer</p>
          </div>
          <a
            href="https://alexszapiro.com"
            className="text-sm text-gray-400 hover:text-black transition-colors"
          >
            ← Portfolio
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Search */}
        <div className="max-w-md mx-auto mb-12">
          <label className="block text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">
            GitHub Username
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              placeholder="username"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:border-black focus:outline-none"
            />
            <button
              onClick={() => fetchData()}
              disabled={isLoading}
              className="px-6 py-3 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition-colors"
            >
              {isLoading ? "Loading..." : "Search"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Fetching profile data...</p>
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <div className="space-y-8">
            {/* Profile Card */}
            <div className="flex items-center gap-6 p-6 border border-gray-200 rounded-lg">
              <img
                src={data.user.avatar_url}
                alt={data.user.name}
                className="w-20 h-20 rounded-full"
              />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-black">{data.user.name}</h2>
                <p className="text-gray-500 text-sm">@{data.user.login}</p>
                {data.user.bio && <p className="text-gray-600 text-sm mt-2">{data.user.bio}</p>}
              </div>
              <a
                href={data.user.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-black transition-colors"
              >
                View Profile →
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <p className="text-2xl font-semibold text-black">{data.user.public_repos}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Repos</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <p className="text-2xl font-semibold text-black">{data.user.followers}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Followers</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <p className="text-2xl font-semibold text-black">{data.user.following}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Following</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <p className="text-2xl font-semibold text-black">{data.streak.current}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Day Streak</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <p className="text-2xl font-semibold text-black">{data.totalContributions}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Contributions</p>
              </div>
            </div>

            {/* Contribution Graph */}
            <div className="p-6 border border-gray-200 rounded-lg">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
                Contribution Activity
              </h3>
              <div className="flex gap-1 overflow-x-auto pb-2">
                {data.contributions.slice(-52 * 7).map((day, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-sm ${getContribColor(day.level)}`}
                    title={`${day.date}: ${day.count} contributions`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <div key={level} className={`w-3 h-3 rounded-sm ${getContribColor(level)}`} />
                ))}
                <span>More</span>
              </div>
            </div>

            {/* Languages */}
            {data.languages.length > 0 && (
              <div className="p-6 border border-gray-200 rounded-lg">
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
                  Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.languages.map((lang, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: lang.color || "#6e7681" }}
                      />
                      <span className="text-sm text-gray-700">{lang.language}</span>
                      <span className="text-xs text-gray-400">{lang.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Repos */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-4">
                Top Repositories
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {data.repos.slice(0, 6).map((repo) => (
                  <a
                    key={repo.name}
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <h4 className="font-medium text-black mb-1">{repo.name}</h4>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {repo.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                          {repo.language}
                        </span>
                      )}
                      <span>★ {repo.stargazers_count}</span>
                      <span>⑂ {repo.forks_count}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {!data && !isLoading && (
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            {[
              { title: "Profile Stats", desc: "Repos, followers, and activity" },
              { title: "Contribution Graph", desc: "Visual activity timeline" },
              { title: "Language Breakdown", desc: "Most used languages" },
            ].map((f, i) => (
              <div key={i} className="p-6 border border-gray-200 rounded-lg text-center">
                <h3 className="font-medium text-black mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-5xl mx-auto px-6 py-6 text-center text-xs text-gray-400">
          Built by Alex Szapiro
        </div>
      </footer>
    </div>
  );
}
