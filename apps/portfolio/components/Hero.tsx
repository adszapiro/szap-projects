"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { personalInfo } from "@/data/config";

// Dynamically import Hero3D to avoid SSR issues with Three.js
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

// Scroll indicator component
function ScrollIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.5 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <span className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Scroll</span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="w-5 h-8 rounded-full border-2 border-[var(--text-muted)] flex justify-center pt-1.5"
      >
        <motion.div
          animate={{ opacity: [1, 0.3, 1], y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-1 h-1.5 bg-[var(--text-muted)] rounded-full"
        />
      </motion.div>
    </motion.div>
  );
}

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

export default function Hero() {
  const tagline = "Building at the intersection of finance and technology.";
  const { displayedText, isComplete } = useTypingAnimation(tagline, 40, 800);

  return (
    <section id="home" className="relative min-h-[90vh] flex flex-col justify-center mb-24 pt-20 pb-16">
      {/* 3D Background */}
      <Hero3D />
      
      <motion.div 
        className="max-w-3xl relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Name with gradient */}
        <motion.h1 
          variants={itemVariants}
          className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
        >
          <span className="gradient-text">{personalInfo.name}</span>
        </motion.h1>
        
        {/* Typing tagline */}
        <motion.p 
          variants={itemVariants}
          className="text-xl md:text-2xl text-[var(--text-secondary)] mb-8 leading-relaxed min-h-[2em]"
        >
          {displayedText.split(/(finance|technology)/i).map((part, i) => {
            if (part.toLowerCase() === "finance") {
              return (
                <span key={i} className="gradient-text-accent font-semibold">
                  {part}
                </span>
              );
            }
            if (part.toLowerCase() === "technology") {
              return (
                <span key={i} className="gradient-text-secondary font-semibold">
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
              className="inline-block w-0.5 h-6 bg-[var(--accent)] ml-0.5 align-middle"
            />
          )}
        </motion.p>

        {/* Education */}
        <motion.p 
          variants={itemVariants}
          className="text-lg text-[var(--text-muted)] mb-10 flex items-center gap-2"
        >
          <span className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
          {personalInfo.education}
        </motion.p>

        {/* CTA Buttons with enhanced hover effects */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap gap-4"
        >
          <a
            href="#projects"
            aria-label="View my projects"
            className="group relative px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-medium overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent)]/25 hover:-translate-y-0.5"
          >
            <span className="relative z-10">View Projects</span>
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent)] to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
          <a
            href="/resume"
            aria-label="View my resume"
            className="px-6 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg font-medium transition-all duration-300 hover:bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:text-[var(--text)] hover:-translate-y-0.5 hover:shadow-md"
          >
            Resume
          </a>
          <a
            href="#contact"
            aria-label="Contact me"
            className="px-6 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg font-medium transition-all duration-300 hover:bg-[var(--bg-secondary)] hover:border-[var(--accent)] hover:text-[var(--text)] hover:-translate-y-0.5 hover:shadow-md"
          >
            Contact
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <ScrollIndicator />
    </section>
  );
}
