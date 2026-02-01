// GitHub API utilities

export interface GitHubUser {
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

export interface GitHubRepo {
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  topics: string[];
}

export interface GitHubEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload: Record<string, unknown>;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export async function getUser(username: string): Promise<GitHubUser> {
  const res = await fetch(`https://api.github.com/users/${username}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`User not found: ${username}`);
  }

  return res.json();
}

export async function getRepos(username: string): Promise<GitHubRepo[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch repos");
  }

  return res.json();
}

export async function getEvents(username: string): Promise<GitHubEvent[]> {
  const res = await fetch(
    `https://api.github.com/users/${username}/events/public?per_page=30`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch events");
  }

  return res.json();
}

// Generate contribution data from events
export function generateContributions(events: GitHubEvent[]): ContributionDay[] {
  const today = new Date();
  const contributions: ContributionDay[] = [];
  const eventCounts: Record<string, number> = {};

  // Count events per day
  events.forEach((event) => {
    const date = event.created_at.split("T")[0];
    eventCounts[date] = (eventCounts[date] || 0) + 1;
  });

  // Generate last 52 weeks of data
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = eventCounts[dateStr] || 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 10) level = 4;
    else if (count >= 5) level = 3;
    else if (count >= 3) level = 2;
    else if (count >= 1) level = 1;

    contributions.push({ date: dateStr, count, level });
  }

  return contributions;
}

// Calculate streak
export function calculateStreak(contributions: ContributionDay[]): {
  current: number;
  longest: number;
} {
  let current = 0;
  let longest = 0;
  let tempStreak = 0;

  // Reverse to start from today
  const reversed = [...contributions].reverse();

  for (let i = 0; i < reversed.length; i++) {
    if (reversed[i].count > 0) {
      tempStreak++;
      if (i === 0 || reversed[i - 1].count > 0) {
        current = tempStreak;
      }
      longest = Math.max(longest, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return { current, longest };
}

// Get language stats from repos
export function getLanguageStats(
  repos: GitHubRepo[]
): { language: string; count: number; color: string }[] {
  const languageColors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Python: "#3572A5",
    Rust: "#dea584",
    Go: "#00ADD8",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    Ruby: "#701516",
    Swift: "#F05138",
    Kotlin: "#A97BFF",
    default: "#6e7681",
  };

  const counts: Record<string, number> = {};
  repos.forEach((repo) => {
    if (repo.language) {
      counts[repo.language] = (counts[repo.language] || 0) + 1;
    }
  });

  return Object.entries(counts)
    .map(([language, count]) => ({
      language,
      count,
      color: languageColors[language] || languageColors.default,
    }))
    .sort((a, b) => b.count - a.count);
}
