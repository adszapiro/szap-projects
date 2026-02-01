"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Loader2,
  Globe,
  Keyboard,
  RotateCcw,
} from "lucide-react";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface RequestHistory {
  id: string;
  method: HttpMethod;
  url: string;
  status: number;
  time: number;
  timestamp: string;
}

export default function Home() {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/posts/1");
  const [headers, setHeaders] = useState<Header[]>([
    { key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [activeTab, setActiveTab] = useState<"headers" | "body">("headers");
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Load history from localStorage (Nielsen #6: Recognition over Recall)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("api-tester-history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((newHistory: RequestHistory[]) => {
    try {
      localStorage.setItem("api-tester-history", JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }, []);

  // Clear history (Nielsen #3: User Control and Freedom)
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem("api-tester-history");
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  }, []);

  const methodColors: Record<HttpMethod, string> = {
    GET: "bg-green-600",
    POST: "bg-yellow-600",
    PUT: "bg-blue-600",
    PATCH: "bg-purple-600",
    DELETE: "bg-red-600",
  };

  // Keyboard shortcuts (Nielsen #7: Flexibility and Efficiency)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to send request
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        sendRequest();
      }
      // ? to show shortcuts
      if (e.key === "?" && !e.target) {
        setShowShortcuts(true);
      }
      // Escape to close shortcuts
      if (e.key === "Escape") {
        setShowShortcuts(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const sendRequest = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.enabled && h.key.trim()) {
          headerObj[h.key] = h.value;
        }
      });

      const options: RequestInit = {
        method,
        headers: headerObj,
      };

      if (["POST", "PUT", "PATCH"].includes(method) && body.trim()) {
        options.body = body;
      }

      const res = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, method, headers: headerObj, body: options.body }),
      });

      const data = await res.json();
      const endTime = performance.now();
      const time = Math.round(endTime - startTime);

      setResponseStatus(data.status);
      setResponseTime(time);
      setResponse(JSON.stringify(data.data, null, 2));

      // Add to history and persist
      const newHistoryItem: RequestHistory = {
        id: crypto.randomUUID(),
        method,
        url,
        status: data.status,
        time,
        timestamp: new Date().toISOString(),
      };
      const newHistory = [newHistoryItem, ...history.slice(0, 9)];
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setResponseStatus(null);
      setResponseTime(null);
    } finally {
      setIsLoading(false);
    }
  };

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "", enabled: true }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: keyof Header, value: string | boolean) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], [field]: value };
    setHeaders(updated);
  };

  const copyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const loadFromHistory = (item: RequestHistory) => {
    setMethod(item.method);
    setUrl(item.url);
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex">
      {/* Sidebar - History */}
      <aside className="w-64 border-r border-[#16213e] flex flex-col">
        <div className="p-4 border-b border-[#16213e]">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#e94560]" />
            <h1 className="text-lg font-bold text-white">API Tester</h1>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[#6c7086] uppercase flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Recent Requests
            </h2>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-[#6c7086] hover:text-red-400 transition-colors"
                aria-label="Clear history"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-[#6c7086]">No requests yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="w-full text-left p-2 rounded-lg bg-[#16213e] hover:bg-[#0f3460] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${methodColors[item.method]} text-white`}>
                      {item.method}
                    </span>
                    <span className={`text-xs ${item.status < 400 ? "text-green-400" : "text-red-400"}`}>
                      {item.status}
                    </span>
                    <span className="text-xs text-[#6c7086]">{item.time}ms</span>
                  </div>
                  <p className="text-xs text-[#8b8fa3] truncate">{item.url}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#16213e] space-y-2">
          <button
            onClick={() => setShowShortcuts(true)}
            className="flex items-center gap-2 text-xs text-[#6c7086] hover:text-white transition-colors"
          >
            <Keyboard className="w-3 h-3" />
            Shortcuts
          </button>
          <a
            href="https://portfolio-adszapiro.vercel.app"
            className="block text-xs text-[#6c7086] hover:text-white transition-colors"
          >
            Back to Portfolio
          </a>
        </div>
      </aside>

      {/* Keyboard Shortcuts Modal (Nielsen #7 + #10) */}
      {showShortcuts && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShortcuts(false)}
        >
          <div 
            className="bg-[#1a1a2e] border border-[#16213e] rounded-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8b8fa3]">Send Request</span>
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-[#16213e] text-[#6c7086] rounded text-xs">⌘</kbd>
                  <span className="text-[#6c7086]">+</span>
                  <kbd className="px-2 py-1 bg-[#16213e] text-[#6c7086] rounded text-xs">Enter</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8b8fa3]">Close Modal</span>
                <kbd className="px-2 py-1 bg-[#16213e] text-[#6c7086] rounded text-xs">Esc</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-6 w-full py-2 bg-[#e94560] hover:bg-[#d63850] text-white rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Request Bar */}
        <div className="p-4 border-b border-[#16213e]">
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className={`px-3 py-2 rounded-lg font-medium text-white ${methodColors[method]} border-none outline-none cursor-pointer`}
            >
              {(["GET", "POST", "PUT", "PATCH", "DELETE"] as HttpMethod[]).map((m) => (
                <option key={m} value={m} className="bg-[#16213e]">
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendRequest()}
              placeholder="Enter request URL"
              className="flex-1 px-4 py-2 bg-[#16213e] border border-[#0f3460] rounded-lg text-white placeholder-[#6c7086] focus:border-[#e94560] outline-none"
            />
            <button
              onClick={sendRequest}
              disabled={isLoading}
              className="px-6 py-2 bg-[#e94560] hover:bg-[#d63850] disabled:bg-[#6c7086] text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </div>

        {/* Request Options */}
        <div className="flex-1 flex">
          {/* Left Panel - Request */}
          <div className="w-1/2 border-r border-[#16213e] flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-[#16213e]">
              <button
                onClick={() => setActiveTab("headers")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "headers"
                    ? "text-[#e94560] border-b-2 border-[#e94560]"
                    : "text-[#6c7086] hover:text-white"
                }`}
              >
                Headers ({headers.filter((h) => h.enabled).length})
              </button>
              <button
                onClick={() => setActiveTab("body")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "body"
                    ? "text-[#e94560] border-b-2 border-[#e94560]"
                    : "text-[#6c7086] hover:text-white"
                }`}
              >
                Body
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "headers" && (
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={(e) => updateHeader(index, "enabled", e.target.checked)}
                        className="w-4 h-4 accent-[#e94560]"
                      />
                      <input
                        type="text"
                        value={header.key}
                        onChange={(e) => updateHeader(index, "key", e.target.value)}
                        placeholder="Key"
                        className="flex-1 px-3 py-1.5 bg-[#16213e] border border-[#0f3460] rounded text-white text-sm placeholder-[#6c7086] focus:border-[#e94560] outline-none"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => updateHeader(index, "value", e.target.value)}
                        placeholder="Value"
                        className="flex-1 px-3 py-1.5 bg-[#16213e] border border-[#0f3460] rounded text-white text-sm placeholder-[#6c7086] focus:border-[#e94560] outline-none"
                      />
                      <button
                        onClick={() => removeHeader(index)}
                        className="p-1.5 text-[#6c7086] hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addHeader}
                    className="flex items-center gap-1 text-sm text-[#e94560] hover:text-[#ff6b8a] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Header
                  </button>
                </div>
              )}

              {activeTab === "body" && (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full h-64 px-4 py-3 bg-[#16213e] border border-[#0f3460] rounded-lg text-white placeholder-[#6c7086] focus:border-[#e94560] outline-none font-mono text-sm resize-none"
                />
              )}
            </div>
          </div>

          {/* Right Panel - Response */}
          <div className="w-1/2 flex flex-col">
            {/* Response Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#16213e]">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#6c7086]">Response</span>
                {responseStatus !== null && (
                  <>
                    <span className={`flex items-center gap-1 text-sm ${responseStatus < 400 ? "text-green-400" : "text-red-400"}`}>
                      {responseStatus < 400 ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {responseStatus}
                    </span>
                    <span className="text-sm text-[#6c7086]">{responseTime}ms</span>
                  </>
                )}
              </div>
              {response && (
                <button
                  onClick={copyResponse}
                  className="flex items-center gap-1 text-sm text-[#6c7086] hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>

            {/* Response Body */}
            <div className="flex-1 overflow-auto p-4">
              {error && (
                <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
                  {error}
                </div>
              )}
              {response && (
                <pre className="text-sm font-mono text-[#a5d6a7] whitespace-pre-wrap break-words">
                  {response}
                </pre>
              )}
              {!response && !error && !isLoading && (
                <div className="flex items-center justify-center h-full text-[#6c7086]">
                  Send a request to see the response
                </div>
              )}
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-[#e94560] animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
