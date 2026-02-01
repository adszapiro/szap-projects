import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Trading Bot | Szap Projects",
  description: "Live paper trading with Alpaca - Execute strategies in real-time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
