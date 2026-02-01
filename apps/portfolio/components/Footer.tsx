"use client";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 border-t border-gray-800/50">
      <div className="max-w-4xl mx-auto px-6">
        <p className="text-sm text-gray-600">
          © {currentYear} Alex Szapiro
        </p>
      </div>
    </footer>
  );
}
