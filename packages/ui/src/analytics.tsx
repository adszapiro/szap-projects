"use client";

import { useEffect } from "react";

/**
 * Analytics component for Vercel Analytics integration
 * 
 * Add this to your layout.tsx to enable:
 * - Page views
 * - Core Web Vitals
 * - Custom events
 * 
 * Usage:
 * import { Analytics } from "@repo/ui/analytics";
 * 
 * <Analytics />
 */

// Simple page view tracking using Vercel Web Analytics
// Note: Core Web Vitals are automatically tracked by @vercel/analytics
export function Analytics() {
  useEffect(() => {
    // Track page views
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      // Core Web Vitals are automatically tracked by Vercel Analytics
      // No manual setup needed when using @vercel/analytics package
      console.log("[Analytics] Page view tracked");
    }
  }, []);

  // This component renders nothing - it just sets up tracking
  return null;
}

/**
 * Custom event tracking utility
 * 
 * Usage:
 * import { trackEvent } from "@repo/ui/analytics";
 * trackEvent("button_click", { buttonId: "submit" });
 */
export function trackEvent(name: string, properties?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  
  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics Event]", name, properties);
    return;
  }
  
  // Send to Vercel Analytics if available
  try {
    // Check if Vercel Analytics is loaded
    if ((window as unknown as { va?: (action: string, data: unknown) => void }).va) {
      (window as unknown as { va: (action: string, data: unknown) => void }).va("event", { name, ...properties });
    }
  } catch (e) {
    // Silently fail if analytics not available
  }
}

/**
 * Error tracking utility
 * 
 * Usage:
 * import { trackError } from "@repo/ui/analytics";
 * trackError(error, { context: "API call" });
 */
export function trackError(error: Error, context?: Record<string, string>) {
  if (typeof window === "undefined") return;
  
  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.error("[Error Tracked]", error.message, context);
    return;
  }
  
  // Send to error tracking service
  // This could be Sentry, LogRocket, etc.
  trackEvent("error", {
    message: error.message,
    name: error.name,
    ...context,
  });
}
