// Local storage utilities for snippets

export interface Snippet {
  id: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "snippet-vault-snippets";
const INITIALIZED_KEY = "snippet-vault-initialized";

export function isFirstVisit(): boolean {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(INITIALIZED_KEY);
}

export function markAsInitialized(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INITIALIZED_KEY, "true");
}

export function getSnippets(): Snippet[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSnippet(snippet: Omit<Snippet, "id" | "createdAt" | "updatedAt">): Snippet {
  const snippets = getSnippets();
  const newSnippet: Snippet = {
    ...snippet,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  snippets.unshift(newSnippet);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  return newSnippet;
}

export function updateSnippet(id: string, updates: Partial<Snippet>): Snippet | null {
  const snippets = getSnippets();
  const index = snippets.findIndex((s) => s.id === id);
  if (index === -1) return null;

  snippets[index] = {
    ...snippets[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
  return snippets[index];
}

export function deleteSnippet(id: string): boolean {
  const snippets = getSnippets();
  const filtered = snippets.filter((s) => s.id !== id);
  if (filtered.length === snippets.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function searchSnippets(query: string): Snippet[] {
  const snippets = getSnippets();
  const lower = query.toLowerCase();
  return snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(lower) ||
      s.code.toLowerCase().includes(lower) ||
      s.tags.some((t) => t.toLowerCase().includes(lower)) ||
      s.language.toLowerCase().includes(lower)
  );
}

// Sample snippets for demo - returns true if samples were loaded (first visit)
export function initSampleSnippets(): boolean {
  // Only load samples on first visit, tracked separately from snippet count
  // This ensures samples don't reload if user deletes all snippets
  if (!isFirstVisit()) return false;

  const samples: Omit<Snippet, "id" | "createdAt" | "updatedAt">[] = [
    {
      title: "React useDebounce Hook",
      code: `import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}`,
      language: "typescript",
      tags: ["react", "hooks", "debounce"],
    },
    {
      title: "Tailwind Animated Button",
      code: `<button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 
  text-white font-semibold rounded-xl 
  hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 
  transition-all duration-200 active:scale-95">
  Click Me
</button>`,
      language: "jsx",
      tags: ["tailwind", "button", "animation"],
    },
    {
      title: "Python Quicksort",
      code: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)`,
      language: "python",
      tags: ["algorithm", "sorting", "recursion"],
    },
    {
      title: "Fetch with Retry",
      code: `async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}`,
      language: "typescript",
      tags: ["fetch", "retry", "async"],
    },
  ];

  samples.forEach(saveSnippet);
  markAsInitialized();
  return true;
}
