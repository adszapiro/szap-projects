import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "API Tester - Test APIs in Your Browser",
  description: "A Postman-like tool for testing REST APIs. Send requests, view responses, save collections.",
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
