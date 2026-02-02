"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <section id="about" className="mb-24 scroll-mt-20">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-semibold text-[var(--text)] mb-8"
      >
        About
      </motion.h2>

      <div className="max-w-3xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-[var(--text-secondary)] space-y-5 leading-relaxed"
        >
          <p className="text-lg">
            I&apos;m a student at the <span className="text-[var(--text)]">University of Michigan</span> pursuing 
            a B.A. in Economics with a Minor in Real Estate. I&apos;m self-taught in software 
            engineering and passionate about building tools at the intersection of 
            finance and technology. Expected graduation: 2028.
          </p>
          
          <p className="text-lg">
            My background spans finance, entrepreneurship, and technology. I&apos;ve worked as a 
            <span className="text-[var(--text)]"> Private Credit Intern at Churchill Real Estate</span>, 
            founded a luxury goods business, and led investment clubs. Now I&apos;m combining 
            my business background with software engineering.
          </p>

          <p className="text-lg text-[var(--text-muted)]">
            Outside of work: go-karts, college athletics, NFL, padel, and vinyl collecting.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
