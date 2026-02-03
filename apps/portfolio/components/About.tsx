"use client";

import { motion } from "framer-motion";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

export default function About() {
  return (
    <section id="about" className="mb-24 scroll-mt-20">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        className="text-2xl font-semibold text-[var(--text)] mb-8"
      >
        <span className="inline-block">
          About
          <motion.span
            initial={{ width: 0 }}
            whileInView={{ width: "100%" }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="block h-0.5 bg-gradient-to-r from-[var(--accent)] to-purple-500"
          />
        </span>
      </motion.h2>

      <div className="max-w-3xl">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="text-[var(--text-secondary)] space-y-5 leading-relaxed"
        >
          <motion.p variants={itemVariants} className="text-lg">
            I&apos;m a student at the{" "}
            <span className="text-[var(--text)] font-medium hover:text-[var(--accent)] transition-colors cursor-default">
              University of Michigan
            </span>{" "}
            pursuing a B.A. in Economics with a Minor in Real Estate. I&apos;m self-taught in software 
            engineering and passionate about building tools at the intersection of 
            finance and technology. Expected graduation: 2028.
          </motion.p>
          
          <motion.p variants={itemVariants} className="text-lg">
            My background spans finance, entrepreneurship, and technology. I&apos;ve worked as a
            <span className="text-[var(--text)] font-medium hover:text-[var(--accent)] transition-colors cursor-default">
              {" "}Private Credit Intern at Churchill Real Estate
            </span>, 
            founded a luxury goods business, and led investment clubs. Now I&apos;m combining 
            my business background with software engineering.
          </motion.p>

          <motion.p 
            variants={itemVariants} 
            className="text-lg text-[var(--text-muted)] flex items-start gap-3"
          >
            <span className="inline-block mt-2 w-1.5 h-1.5 bg-[var(--accent)] rounded-full flex-shrink-0" />
            <span>Outside of work: go-karts, college athletics, NFL, padel, and vinyl collecting.</span>
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
