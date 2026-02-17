"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { personalInfo } from "@/data/config";

const Hero3D = dynamic(() => import("./Hero3D"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--bg)] to-[var(--bg-secondary)]" />
});

// Typing animation hook
function useTypingAnimation(text: string, speed: number = 50, startDelay: number = 500) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let charIndex = 0;

    const startTyping = () => {
      timeout = setTimeout(function type() {
        if (charIndex < text.length) {
          setDisplayedText(text.slice(0, charIndex + 1));
          charIndex++;
          timeout = setTimeout(type, speed);
        } else {
          setIsComplete(true);
        }
      }, speed);
    };

    const delayTimeout = setTimeout(startTyping, startDelay);

    return () => {
      clearTimeout(timeout);
      clearTimeout(delayTimeout);
    };
  }, [text, speed, startDelay]);

  return { displayedText, isComplete };
}

function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2, duration: 0.5 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">Scroll</span>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-[1px] h-8 bg-[var(--border)]"
      />
    </motion.div>
  );
}

// Organic stagger — not mechanical
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.25,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

export default function Hero() {
  const tagline = "Building at the intersection of finance and technology.";
  const { displayedText, isComplete } = useTypingAnimation(tagline, 40, 1000);

  return (
    <section id="home" className="relative min-h-[90vh] flex flex-col justify-center mb-24 pt-20 pb-16">
      <Hero3D />

      <motion.div
        className="max-w-3xl relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Name — serif, large, no gradient */}
        <motion.h1
          variants={itemVariants}
          className="font-[family-name:var(--font-display)] text-5xl md:text-6xl lg:text-7xl mb-6 leading-[1.1] text-[var(--text)]"
        >
          {personalInfo.name}
        </motion.h1>

        {/* Typing tagline */}
        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-[var(--text-secondary)] mb-8 leading-relaxed min-h-[2em]"
        >
          {displayedText.split(/(finance|technology)/i).map((part, i) => {
            if (part.toLowerCase() === "finance") {
              return (
                <span key={i} className="text-[var(--accent)] font-medium">
                  {part}
                </span>
              );
            }
            if (part.toLowerCase() === "technology") {
              return (
                <span key={i} className="text-[var(--accent-warm)] font-medium">
                  {part}
                </span>
              );
            }
            return part;
          })}
          {!isComplete && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-0.5 h-5 bg-[var(--accent)] ml-0.5 align-middle"
            />
          )}
        </motion.p>

        {/* Education — thin rule above */}
        <motion.div variants={itemVariants} className="mb-10">
          <div className="thin-rule mb-4 max-w-[200px]" />
          <p className="text-sm text-[var(--text-muted)] uppercase tracking-[0.15em]">
            {personalInfo.education}
          </p>
        </motion.div>

        {/* CTA — clean, no lifts */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap gap-4"
        >
          <a
            href="#projects"
            aria-label="View my projects"
            className="px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-medium transition-colors duration-300 hover:bg-[var(--accent-hover)]"
          >
            View Projects
          </a>
          <a
            href="/resume"
            aria-label="View my resume"
            className="px-6 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg font-medium transition-colors duration-300 hover:border-[var(--accent)] hover:text-[var(--text)]"
          >
            Resume
          </a>
          <a
            href="#contact"
            aria-label="Contact me"
            className="px-6 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg font-medium transition-colors duration-300 hover:border-[var(--accent)] hover:text-[var(--text)]"
          >
            Contact
          </a>
        </motion.div>
      </motion.div>

      <ScrollIndicator />
    </section>
  );
}
