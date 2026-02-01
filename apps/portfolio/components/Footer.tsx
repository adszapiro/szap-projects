"use client";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 border-t border-gray-800">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <p className="text-gray-500">
          © {currentYear} Alex Szapiro. Built with{" "}
          <span className="text-purple-400">Next.js</span>,{" "}
          <span className="text-cyan-400">Three.js</span> &{" "}
          <span className="text-blue-400">Tailwind CSS</span>.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Designed and developed with care.
        </p>
      </div>
    </footer>
  );
}
