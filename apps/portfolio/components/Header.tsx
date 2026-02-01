"use client";

import { motion } from "framer-motion";

export default function Header() {
  const navLinks = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Projects", href: "#projects" },
    { label: "Resume", href: "/resume" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-gray-800"
    >
      <nav className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a 
            href="#home" 
            className="text-xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent"
          >
            Alex Szapiro
          </a>

          {/* Navigation Links */}
          <ul className="flex items-center gap-6">
            {navLinks.map((link, i) => (
              <motion.li 
                key={link.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <a
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors relative group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 transition-all group-hover:w-full" />
                </a>
              </motion.li>
            ))}
          </ul>
        </div>
      </nav>
    </motion.header>
  );
}
