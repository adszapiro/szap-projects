"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeColors {
  bg: string;
  bgSecondary: string;
  bgElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderHover: string;
  accent: string;
  accentHover: string;
  cardBg: string;
  cardBorder: string;
  positive: string;
  negative: string;
  warning: string;
}

const LIGHT_DEFAULTS: ThemeColors = {
  bg: "#faf5ef",
  bgSecondary: "#f5ede3",
  bgElevated: "#efe7db",
  text: "#2c2016",
  textSecondary: "#5c4a3a",
  textMuted: "#8a7a6a",
  border: "#e0d5c8",
  borderHover: "#cfc2b3",
  accent: "#d4a574",
  accentHover: "#c9825b",
  cardBg: "#fdf8f2",
  cardBorder: "#e8ddd0",
  positive: "#7a9e4a",
  negative: "#b5634f",
  warning: "#c4903a",
};

const DARK_DEFAULTS: ThemeColors = {
  bg: "#121010",
  bgSecondary: "#1a1512",
  bgElevated: "#211d19",
  text: "#f5e6d3",
  textSecondary: "#c9b79c",
  textMuted: "#9b8772",
  border: "#2a2420",
  borderHover: "#3d342b",
  accent: "#d4a574",
  accentHover: "#e6b889",
  cardBg: "#1a1512",
  cardBorder: "#2a2420",
  positive: "#9cb870",
  negative: "#c67b6a",
  warning: "#d9a45e",
};

function getCSSVar(name: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function useThemeColors(): ThemeColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ThemeColors>(
    resolvedTheme === "dark" ? DARK_DEFAULTS : LIGHT_DEFAULTS
  );

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setColors({
        bg: getCSSVar("--bg") || (resolvedTheme === "dark" ? DARK_DEFAULTS.bg : LIGHT_DEFAULTS.bg),
        bgSecondary: getCSSVar("--bg-secondary") || (resolvedTheme === "dark" ? DARK_DEFAULTS.bgSecondary : LIGHT_DEFAULTS.bgSecondary),
        bgElevated: getCSSVar("--bg-elevated") || (resolvedTheme === "dark" ? DARK_DEFAULTS.bgElevated : LIGHT_DEFAULTS.bgElevated),
        text: getCSSVar("--text") || (resolvedTheme === "dark" ? DARK_DEFAULTS.text : LIGHT_DEFAULTS.text),
        textSecondary: getCSSVar("--text-secondary") || (resolvedTheme === "dark" ? DARK_DEFAULTS.textSecondary : LIGHT_DEFAULTS.textSecondary),
        textMuted: getCSSVar("--text-muted") || (resolvedTheme === "dark" ? DARK_DEFAULTS.textMuted : LIGHT_DEFAULTS.textMuted),
        border: getCSSVar("--border") || (resolvedTheme === "dark" ? DARK_DEFAULTS.border : LIGHT_DEFAULTS.border),
        borderHover: getCSSVar("--border-hover") || (resolvedTheme === "dark" ? DARK_DEFAULTS.borderHover : LIGHT_DEFAULTS.borderHover),
        accent: getCSSVar("--accent") || (resolvedTheme === "dark" ? DARK_DEFAULTS.accent : LIGHT_DEFAULTS.accent),
        accentHover: getCSSVar("--accent-hover") || (resolvedTheme === "dark" ? DARK_DEFAULTS.accentHover : LIGHT_DEFAULTS.accentHover),
        cardBg: getCSSVar("--card-bg") || (resolvedTheme === "dark" ? DARK_DEFAULTS.cardBg : LIGHT_DEFAULTS.cardBg),
        cardBorder: getCSSVar("--card-border") || (resolvedTheme === "dark" ? DARK_DEFAULTS.cardBorder : LIGHT_DEFAULTS.cardBorder),
        positive: getCSSVar("--positive") || (resolvedTheme === "dark" ? DARK_DEFAULTS.positive : LIGHT_DEFAULTS.positive),
        negative: getCSSVar("--negative") || (resolvedTheme === "dark" ? DARK_DEFAULTS.negative : LIGHT_DEFAULTS.negative),
        warning: getCSSVar("--warning") || (resolvedTheme === "dark" ? DARK_DEFAULTS.warning : LIGHT_DEFAULTS.warning),
      });
    });
    return () => cancelAnimationFrame(timer);
  }, [resolvedTheme]);

  return colors;
}
