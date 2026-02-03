"use client";

import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.footer 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="py-8 border-t border-[var(--border)]"
    >
      <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          © {currentYear}{" "}
          <span className="hover:text-[var(--accent)] transition-colors cursor-default">
            Alex Szapiro
          </span>
        </p>
        
        {/* Back to top button */}
        <motion.button
          onClick={scrollToTop}
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="group p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all duration-200"
          aria-label="Back to top"
        >
          <ArrowUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
        </motion.button>
      </div>
    </motion.footer>
  );
}
