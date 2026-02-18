import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-[var(--accent)] text-sm tracking-widest uppercase mb-4">404</p>
        <h1 className="font-[family-name:var(--font-display)] text-5xl text-[var(--text)] mb-4">
          Page Not Found
        </h1>
        <p className="text-[var(--text-secondary)] mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="text-[var(--accent)] hover:text-[var(--text)] transition-colors text-sm tracking-wide"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
