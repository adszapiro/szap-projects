"use client";

import { motion } from "framer-motion";

export default function Header() {
  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Projects", href: "#projects" },
    { label: "Resume", href: "/resume" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0f1a]/90 backdrop-blur-md border-b border-gray-800/50">
      <nav className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <a 
            href="#home" 
            className="text-lg font-semibold text-white hover:text-gray-300 transition-colors"
          >
            AS
          </a>

          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <motion.li 
                key={link.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <a
                  href={link.href}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              </motion.li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
