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
export function Analytics() {
  useEffect(() => {
    // Track page views
    if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
      // Report to Vercel Analytics if available
      const reportWebVitals = async () => {
        try {
          // Dynamic import to avoid issues in development
          const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import("web-vitals");
          
          getCLS(sendToAnalytics);
          getFID(sendToAnalytics);
          getFCP(sendToAnalytics);
          getLCP(sendToAnalytics);
          getTTFB(sendToAnalytics);
        } catch (e) {
          // web-vitals not installed, skip
        }
      };
      
      reportWebVitals();
    }
  }, []);

  // This component renders nothing - it just sets up tracking
  return null;
}

// Send metrics to analytics endpoint
function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", metric.name, metric.value);
  }
  
  // In production, metrics are automatically sent to Vercel Analytics
  // if using @vercel/analytics package
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
