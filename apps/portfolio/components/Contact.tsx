"use client";

import { motion } from "framer-motion";
import { Mail, Github, Linkedin, Download, ArrowRight } from "lucide-react";
import { personalInfo, aboutText } from "@/data/config";

export default function Contact() {
  const { email, github, linkedin } = personalInfo;

  return (
    <section id="contact" className="mb-24 scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="thin-rule mb-8" />

        <h2 className="font-[family-name:var(--font-display)] text-3xl italic text-[var(--text)] mb-4">
          Let&apos;s Connect
        </h2>

        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed max-w-lg text-base">
          {aboutText.intro}
        </p>

        {/* Email — prominent */}
        <a
          href={`mailto:${email}`}
          className="group inline-flex items-center gap-3 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors duration-300 mb-8"
        >
          <Mail className="w-5 h-5" />
          <span>Get in Touch</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>

        {/* Secondary links */}
        <div className="flex flex-wrap gap-3 pt-6 border-t border-[var(--border)]">
          <a
            href="/resume.pdf"
            download
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[var(--text-secondary)] text-sm font-medium transition-colors duration-200 hover:text-[var(--accent)]"
          >
            <Download className="w-4 h-4" />
            Resume
          </a>

          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[var(--text-secondary)] text-sm font-medium transition-colors duration-200 hover:text-[var(--accent)]"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>

          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[var(--text-secondary)] text-sm font-medium transition-colors duration-200 hover:text-[var(--accent)]"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </a>
        </div>

        <p className="mt-6 text-sm text-[var(--text-muted)]">
          Or email directly at{" "}
          <a
            href={`mailto:${email}`}
            className="text-[var(--accent)] hover:underline"
          >
            {email}
          </a>
        </p>
      </motion.div>
    </section>
  );
}
