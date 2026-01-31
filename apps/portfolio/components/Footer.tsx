// ============================================
// Footer Component - Bottom of the Page
// ============================================

export default function Footer() {
  // Get the current year dynamically
  // new Date() creates a date object, .getFullYear() gets the year
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 border-t border-gray-200 dark:border-gray-800">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          © {currentYear} Alex Szapiro. Built with Next.js & Tailwind CSS.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Designed and developed with care.
        </p>
      </div>
    </footer>
  );
}

// new Date().getFullYear() returns the current year (e.g., 2024)
// This means you never have to update the copyright year manually!
