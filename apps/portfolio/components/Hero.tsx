"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section id="home" className="mb-24 pt-32 pb-16">
      <div className="max-w-3xl">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold text-[var(--text)] mb-6 leading-tight"
        >
          Alex Szapiro
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-xl md:text-2xl text-[var(--text-secondary)] mb-8 leading-relaxed"
        >
          Building at the intersection of{" "}
          <span className="text-[var(--text)]">finance</span> and{" "}
          <span className="text-[var(--text)]">technology</span>.
        </motion.p>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg text-[var(--text-muted)] mb-10"
        >
          Economics @ University of Michigan
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap gap-4"
        >
          <a
            href="#projects"
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors"
          >
            View Projects
          </a>
          <a
            href="/resume"
            className="px-6 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] transition-colors font-medium"
          >
            Resume
          </a>
          <a
            href="#contact"
            className="px-6 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] hover:border-[var(--text-muted)] transition-colors font-medium"
          >
            Contact
          </a>
        </motion.div>
      </div>
    </section>
  );
}
