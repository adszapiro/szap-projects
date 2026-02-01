"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";

interface Shortcut {
  key: string;
  label: string;
  description?: string;
  action: () => void;
  modifiers?: ("ctrl" | "alt" | "shift" | "meta")[];
}

interface KeyboardShortcutsProps {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

// Hook to register keyboard shortcuts
export function useKeyboardShortcuts({ shortcuts, enabled = true }: KeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const modifiersMatch =
          (!shortcut.modifiers?.includes("ctrl") || e.ctrlKey || e.metaKey) &&
          (!shortcut.modifiers?.includes("alt") || e.altKey) &&
          (!shortcut.modifiers?.includes("shift") || e.shiftKey) &&
          (!shortcut.modifiers?.includes("meta") || e.metaKey);

        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (modifiersMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

// Component to display keyboard shortcuts panel
interface ShortcutsPanelProps {
  shortcuts: Omit<Shortcut, "action">[];
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsPanel({ shortcuts, isOpen, onClose }: ShortcutsPanelProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-lg w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-700/50"
            >
              <div>
                <span className="text-white text-sm">{shortcut.label}</span>
                {shortcut.description && (
                  <p className="text-gray-500 text-xs mt-0.5">{shortcut.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {shortcut.modifiers?.map((mod) => (
                  <Kbd key={mod}>{getModifierSymbol(mod)}</Kbd>
                ))}
                <Kbd>{shortcut.key.toUpperCase()}</Kbd>
              </div>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-xs mt-4 text-center">
          Press <Kbd>?</Kbd> to toggle this panel
        </p>
      </div>
    </div>
  );
}

// Keyboard key display component
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-xs font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded shadow-sm">
      {children}
    </kbd>
  );
}

function getModifierSymbol(modifier: string): string {
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");
  
  switch (modifier) {
    case "ctrl":
      return isMac ? "⌃" : "Ctrl";
    case "alt":
      return isMac ? "⌥" : "Alt";
    case "shift":
      return "⇧";
    case "meta":
      return isMac ? "⌘" : "Win";
    default:
      return modifier;
  }
}
