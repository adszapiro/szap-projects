import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeAI - AI-Powered Resume Tailoring",
  description: "Tailor your resume to any job description with AI. Get specific suggestions to improve your chances.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
