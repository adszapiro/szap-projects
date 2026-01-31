// ============================================
// Header Component - Navigation Bar
// ============================================
// This appears at the top of every page

export default function Header() {
  // Navigation links - an array of objects
  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Projects", href: "#projects" },
    { label: "Resume", href: "/resume" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <nav className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo / Name */}
          <a 
            href="#home" 
            className="text-xl font-bold text-gray-900 dark:text-white"
          >
            Portfolio
          </a>

          {/* Navigation Links */}
          <ul className="flex items-center gap-6">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}

// New concepts:
// 1. "fixed" - The header stays at the top even when scrolling
// 2. "z-50" - Makes sure header is above other content
// 3. "backdrop-blur-sm" - Adds a blur effect behind the header
// 4. href="#about" - Links to a section with id="about" on the page
