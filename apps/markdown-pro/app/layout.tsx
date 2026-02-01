import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarkdownPro - Live Markdown Editor",
  description: "A beautiful markdown editor with live preview, export options, and local storage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
