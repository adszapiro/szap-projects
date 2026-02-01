import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnippetVault - Code Snippet Manager",
  description: "Save, organize, and share code snippets with beautiful syntax highlighting.",
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
