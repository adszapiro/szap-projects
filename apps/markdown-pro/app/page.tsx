"use client";

import { useState, useEffect, useCallback } from "react";
import { marked } from "marked";
import {
  FileText,
  Download,
  Copy,
  Check,
  Eye,
  Edit3,
  Columns,
  Sun,
  Moon,
  Save,
  Trash2,
  FolderOpen,
} from "lucide-react";

const DEFAULT_MARKDOWN = `# Welcome to MarkdownPro

A **beautiful** markdown editor with *live preview*.

## Features

- Real-time preview
- Dark/light theme
- Export to HTML
- Local storage autosave
- Multiple documents

## Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Table

| Feature | Status |
|---------|--------|
| Editor | ✅ |
| Preview | ✅ |
| Export | ✅ |

> "The best markdown editor you'll ever use."

---

Made with ❤️ by [Alex Szapiro](https://portfolio-adszapiro.vercel.app)
`;

interface Document {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

type ViewMode = "edit" | "preview" | "split";

export default function Home() {
  const [markdown, setMarkdown] = useState(DEFAULT_MARKDOWN);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [isDark, setIsDark] = useState(true);
  const [copied, setCopied] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Keyboard shortcuts (Nielsen #7: Flexibility and Efficiency)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S to save/create new doc
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!currentDocId) {
          createNewDocument();
        }
      }
      // Cmd+N for new document
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        createNewDocument();
      }
      // ? to show shortcuts (when not in textarea)
      if (e.key === "?" && !(e.target instanceof HTMLTextAreaElement)) {
        setShowShortcuts(true);
      }
      // Escape to close
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setShowDocs(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Load documents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("markdown-pro-docs");
    if (saved) {
      const docs = JSON.parse(saved);
      setDocuments(docs);
      if (docs.length > 0) {
        setCurrentDocId(docs[0].id);
        setMarkdown(docs[0].content);
      }
    }
  }, []);

  // Autosave current document with indicator (Nielsen #1: Visibility of System Status)
  useEffect(() => {
    if (currentDocId) {
      setIsSaving(true);
      const timer = setTimeout(() => {
        setDocuments((prev) => {
          const updated = prev.map((doc) =>
            doc.id === currentDocId
              ? { ...doc, content: markdown, updatedAt: new Date().toISOString() }
              : doc
          );
          localStorage.setItem("markdown-pro-docs", JSON.stringify(updated));
          return updated;
        });
        setIsSaving(false);
        setLastSaved(new Date());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [markdown, currentDocId]);

  const createNewDocument = () => {
    const newDoc: Document = {
      id: crypto.randomUUID(),
      title: `Untitled ${documents.length + 1}`,
      content: "# New Document\n\nStart writing...",
      updatedAt: new Date().toISOString(),
    };
    setDocuments((prev) => {
      const updated = [newDoc, ...prev];
      localStorage.setItem("markdown-pro-docs", JSON.stringify(updated));
      return updated;
    });
    setCurrentDocId(newDoc.id);
    setMarkdown(newDoc.content);
    setShowDocs(false);
  };

  const loadDocument = (doc: Document) => {
    setCurrentDocId(doc.id);
    setMarkdown(doc.content);
    setShowDocs(false);
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      localStorage.setItem("markdown-pro-docs", JSON.stringify(updated));
      if (currentDocId === id) {
        if (updated.length > 0) {
          setCurrentDocId(updated[0].id);
          setMarkdown(updated[0].content);
        } else {
          setCurrentDocId(null);
          setMarkdown(DEFAULT_MARKDOWN);
        }
      }
      return updated;
    });
  };

  const copyToClipboard = useCallback(async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  const downloadHtml = useCallback(() => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; }
    pre code { background: transparent; padding: 0; }
    blockquote { border-left: 4px solid #ddd; padding-left: 1em; margin-left: 0; color: #666; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 0.5em 1em; text-align: left; }
  </style>
</head>
<body>
${marked(markdown)}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown]);

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.md";
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown]);

  const bgColor = isDark ? "bg-[#1e1e1e]" : "bg-white";
  const textColor = isDark ? "text-[#d4d4d4]" : "text-gray-800";
  const borderColor = isDark ? "border-[#333]" : "border-gray-200";

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} flex flex-col`}>
      {/* Header */}
      <header className={`border-b ${borderColor} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-500" />
          <h1 className="text-lg font-bold">MarkdownPro</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode buttons */}
          <div className={`flex rounded-lg border ${borderColor} overflow-hidden`}>
            <button
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                viewMode === "edit" ? "bg-blue-600 text-white" : ""
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1 border-x ${borderColor} ${
                viewMode === "split" ? "bg-blue-600 text-white" : ""
              }`}
            >
              <Columns className="w-4 h-4" />
              Split
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`px-3 py-1.5 text-sm flex items-center gap-1 ${
                viewMode === "preview" ? "bg-blue-600 text-white" : ""
              }`}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={() => setShowDocs(!showDocs)}
            className={`p-2 rounded-lg border ${borderColor} hover:bg-blue-600 hover:text-white transition-colors`}
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={createNewDocument}
            className={`p-2 rounded-lg border ${borderColor} hover:bg-blue-600 hover:text-white transition-colors`}
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={copyToClipboard}
            className={`p-2 rounded-lg border ${borderColor} hover:bg-blue-600 hover:text-white transition-colors`}
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={downloadMarkdown}
            className={`p-2 rounded-lg border ${borderColor} hover:bg-blue-600 hover:text-white transition-colors`}
            title="Download Markdown"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg border ${borderColor} hover:bg-blue-600 hover:text-white transition-colors`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Documents Panel */}
      {showDocs && (
        <div className={`border-b ${borderColor} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Documents</h2>
            <button
              onClick={createNewDocument}
              className="text-sm text-blue-500 hover:underline"
            >
              + New
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${borderColor} ${
                  currentDocId === doc.id ? "bg-blue-600 text-white border-blue-600" : ""
                }`}
              >
                <button onClick={() => loadDocument(doc)} className="text-sm">
                  {doc.title}
                </button>
                <button
                  onClick={() => deleteDocument(doc.id)}
                  className="opacity-50 hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-sm opacity-50">No saved documents</p>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Editor */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2 border-r" : "w-full"} ${borderColor} flex flex-col`}>
            <div className={`px-4 py-2 border-b ${borderColor} text-xs font-medium opacity-50`}>
              MARKDOWN
            </div>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className={`flex-1 p-4 resize-none outline-none font-mono text-sm ${
                isDark ? "bg-[#1e1e1e] text-[#d4d4d4]" : "bg-white text-gray-800"
              }`}
              placeholder="Write your markdown here..."
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} flex flex-col`}>
            <div className={`px-4 py-2 border-b ${borderColor} text-xs font-medium opacity-50`}>
              PREVIEW
            </div>
            <div
              className={`flex-1 p-4 overflow-auto markdown-preview ${
                isDark ? "" : "bg-white"
              }`}
              dangerouslySetInnerHTML={{ __html: marked(markdown) as string }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t ${borderColor} px-4 py-2 text-xs opacity-50 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <span>
            {markdown.length} characters | {markdown.split(/\s+/).filter(Boolean).length} words
          </span>
          {/* Autosave indicator (Nielsen #1: Visibility of System Status) */}
          {currentDocId && (
            <span className={isSaving ? "text-yellow-500" : "text-green-500"}>
              {isSaving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Saved"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowShortcuts(true)}
            className="hover:text-blue-500"
          >
            Shortcuts
          </button>
          <a href="https://portfolio-adszapiro.vercel.app" className="hover:text-blue-500">
            Built by Alex Szapiro
          </a>
        </div>
      </footer>

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowShortcuts(false)}
        >
          <div 
            className={`${isDark ? "bg-[#1e1e1e] border-[#333]" : "bg-white border-gray-200"} border rounded-xl p-6 max-w-sm w-full mx-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">New Document</span>
                <div className="flex items-center gap-1">
                  <kbd className={`px-2 py-1 ${isDark ? "bg-[#333]" : "bg-gray-100"} rounded text-xs`}>⌘</kbd>
                  <span className="opacity-50">+</span>
                  <kbd className={`px-2 py-1 ${isDark ? "bg-[#333]" : "bg-gray-100"} rounded text-xs`}>N</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Save Document</span>
                <div className="flex items-center gap-1">
                  <kbd className={`px-2 py-1 ${isDark ? "bg-[#333]" : "bg-gray-100"} rounded text-xs`}>⌘</kbd>
                  <span className="opacity-50">+</span>
                  <kbd className={`px-2 py-1 ${isDark ? "bg-[#333]" : "bg-gray-100"} rounded text-xs`}>S</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Close Panels</span>
                <kbd className={`px-2 py-1 ${isDark ? "bg-[#333]" : "bg-gray-100"} rounded text-xs`}>Esc</kbd>
              </div>
            </div>
            <button
              onClick={() => setShowShortcuts(false)}
              className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
