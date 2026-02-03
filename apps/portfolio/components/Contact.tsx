"use client";

import { motion } from "framer-motion";
import { Mail, Github, Linkedin, Download, ArrowRight, Sparkles } from "lucide-react";
import { personalInfo, aboutText } from "@/data/config";

export default function Contact() {
  const { email, github, linkedin } = personalInfo;

  return (
    <section id="contact" className="mb-24 scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative overflow-hidden"
      >
        {/* Background Card with Gradient */}
        <div className="relative p-8 md:p-10 bg-gradient-to-br from-[var(--card-bg)] to-[var(--bg-secondary)] border border-[var(--card-border)] rounded-2xl">
          {/* Decorative gradient blob */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--accent)]/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          {/* Content */}
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--text)]">
                Let's Connect
              </h2>
            </div>

            {/* Description */}
            <p className="text-[var(--text-secondary)] mb-8 leading-relaxed max-w-lg text-base">
              {aboutText.intro}
            </p>

            {/* Primary CTA - Email */}
            <motion.a
              href={`mailto:${email}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group inline-flex items-center gap-3 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl font-medium transition-all duration-200 shadow-lg shadow-[var(--accent)]/20 mb-6"
            >
              <Mail className="w-5 h-5" />
              <span>Get in Touch</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.a>

            {/* Secondary Actions */}
            <div className="flex flex-wrap gap-3 pt-6 border-t border-[var(--border)]">
              {/* Download Resume */}
              <motion.a
                href="/resume.pdf"
                download
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg)] hover:bg-[var(--bg-secondary)] text-[var(--text)] text-sm rounded-lg font-medium transition-all duration-200 border border-[var(--border)] hover:border-[var(--accent)]/30"
              >
                <Download className="w-4 h-4 text-[var(--accent)]" />
                Download Resume
              </motion.a>

              {/* GitHub */}
              <motion.a
                href={github}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm rounded-lg font-medium transition-all duration-200 border border-[var(--border)] hover:border-[var(--text-muted)]/30"
              >
                <Github className="w-4 h-4" />
                GitHub
              </motion.a>

              {/* LinkedIn */}
              <motion.a
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm rounded-lg font-medium transition-all duration-200 border border-[var(--border)] hover:border-[var(--text-muted)]/30"
              >
                <Linkedin className="w-4 h-4" />
                LinkedIn
              </motion.a>
            </div>

            {/* Email display */}
            <p className="mt-6 text-sm text-[var(--text-muted)]">
              Or email directly at{" "}
              <a
                href={`mailto:${email}`}
                className="text-[var(--accent)] hover:underline"
              >
                {email}
              </a>
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
