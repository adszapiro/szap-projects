"use client";

import { useState, useEffect } from "react";
import { Highlight, themes } from "prism-react-renderer";
import {
  Code2,
  Plus,
  Search,
  Copy,
  Trash2,
  Tag,
  Check,
  X,
  Folder,
} from "lucide-react";
import {
  Snippet,
  getSnippets,
  saveSnippet,
  deleteSnippet,
  searchSnippets,
  initSampleSnippets,
} from "@/lib/storage";

const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "jsx",
  "tsx",
  "css",
  "html",
  "json",
  "bash",
  "sql",
  "go",
  "rust",
];

export default function Home() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSnippet, setSelectedSnippet] = useState<Snippet | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New snippet form state
  const [newTitle, setNewTitle] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newLanguage, setNewLanguage] = useState("javascript");
  const [newTags, setNewTags] = useState("");

  useEffect(() => {
    initSampleSnippets();
    setSnippets(getSnippets());
  }, []);

  useEffect(() => {
    if (searchQuery) {
      setSnippets(searchSnippets(searchQuery));
    } else {
      setSnippets(getSnippets());
    }
  }, [searchQuery]);

  const handleCreate = () => {
    if (!newTitle.trim() || !newCode.trim()) return;

    const snippet = saveSnippet({
      title: newTitle,
      code: newCode,
      language: newLanguage,
      tags: newTags.split(",").map((t) => t.trim()).filter(Boolean),
    });

    setSnippets([snippet, ...snippets]);
    setSelectedSnippet(snippet);
    setIsCreating(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteSnippet(id);
    setSnippets(snippets.filter((s) => s.id !== id));
    if (selectedSnippet?.id === id) {
      setSelectedSnippet(null);
    }
  };

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setNewTitle("");
    setNewCode("");
    setNewLanguage("javascript");
    setNewTags("");
  };

  return (
    <div className="min-h-screen bg-[#1e1e2e] flex">
      {/* Sidebar */}
      <aside className="w-80 border-r border-[#313244] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#313244]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">SnippetVault</h1>
              <p className="text-xs text-[#6c7086]">Code Snippet Manager</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6c7086]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search snippets..."
              className="w-full pl-9 pr-3 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white placeholder-[#6c7086] focus:border-[#cba6f7] outline-none text-sm"
            />
          </div>
        </div>

        {/* Create Button */}
        <div className="p-4">
          <button
            onClick={() => {
              setIsCreating(true);
              setSelectedSnippet(null);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#cba6f7] hover:bg-[#b4befe] text-[#1e1e2e] font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Snippet
          </button>
        </div>

        {/* Snippet List */}
        <div className="flex-1 overflow-y-auto p-2">
          {snippets.length === 0 ? (
            <div className="text-center py-8 text-[#6c7086]">
              <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No snippets found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {snippets.map((snippet) => (
                <button
                  key={snippet.id}
                  onClick={() => {
                    setSelectedSnippet(snippet);
                    setIsCreating(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedSnippet?.id === snippet.id
                      ? "bg-[#313244] text-white"
                      : "text-[#cdd6f4] hover:bg-[#313244]/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">{snippet.title}</span>
                    <span className="text-xs text-[#6c7086] px-1.5 py-0.5 bg-[#181825] rounded">
                      {snippet.language}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {snippet.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs text-[#89b4fa]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#313244] text-center">
          <a
            href="https://portfolio-adszapiro.vercel.app"
            className="text-xs text-[#6c7086] hover:text-white transition-colors"
          >
            Back to Portfolio
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Create Form */}
        {isCreating && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">New Snippet</h2>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    resetForm();
                  }}
                  className="p-2 text-[#6c7086] hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#6c7086] mb-2">Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="My awesome snippet"
                    className="w-full px-4 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white placeholder-[#6c7086] focus:border-[#cba6f7] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#6c7086] mb-2">Language</label>
                    <select
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      className="w-full px-4 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white focus:border-[#cba6f7] outline-none"
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-[#6c7086] mb-2">Tags (comma separated)</label>
                    <input
                      type="text"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="react, hooks, utils"
                      className="w-full px-4 py-2 bg-[#181825] border border-[#313244] rounded-lg text-white placeholder-[#6c7086] focus:border-[#cba6f7] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#6c7086] mb-2">Code</label>
                  <textarea
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Paste your code here..."
                    rows={15}
                    className="w-full px-4 py-3 bg-[#181825] border border-[#313244] rounded-lg text-white placeholder-[#6c7086] focus:border-[#cba6f7] outline-none font-mono text-sm resize-none"
                  />
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || !newCode.trim()}
                  className="px-6 py-2 bg-[#cba6f7] hover:bg-[#b4befe] disabled:bg-[#45475a] disabled:cursor-not-allowed text-[#1e1e2e] font-medium rounded-lg transition-colors"
                >
                  Save Snippet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Snippet View */}
        {selectedSnippet && !isCreating && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-[#313244]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedSnippet.title}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm px-2 py-1 bg-[#313244] text-[#cba6f7] rounded">
                      {selectedSnippet.language}
                    </span>
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#6c7086]" />
                      {selectedSnippet.tags.map((tag) => (
                        <span key={tag} className="text-sm text-[#89b4fa]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedSnippet.code, selectedSnippet.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-[#313244] hover:bg-[#45475a] text-white rounded-lg transition-colors"
                  >
                    {copiedId === selectedSnippet.id ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedSnippet.id)}
                    className="p-2 text-[#f38ba8] hover:bg-[#f38ba8]/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Code */}
            <div className="flex-1 overflow-auto p-6">
              <Highlight
                theme={themes.nightOwl}
                code={selectedSnippet.code}
                language={selectedSnippet.language as never}
              >
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className={`${className} p-4 rounded-xl text-sm overflow-auto`}
                    style={{ ...style, background: "#181825" }}
                  >
                    {tokens.map((line, i) => (
                      <div key={i} {...getLineProps({ line })} className="table-row">
                        <span className="table-cell pr-4 text-[#6c7086] select-none text-right w-8">
                          {i + 1}
                        </span>
                        <span className="table-cell">
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                        </span>
                      </div>
                    ))}
                  </pre>
                )}
              </Highlight>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedSnippet && !isCreating && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Code2 className="w-16 h-16 text-[#45475a] mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Select a Snippet</h2>
              <p className="text-[#6c7086]">
                Choose a snippet from the sidebar or create a new one
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
