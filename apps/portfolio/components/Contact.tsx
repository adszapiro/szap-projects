"use client";

import { motion } from "framer-motion";
import { Mail, Github, Linkedin } from "lucide-react";
import { personalInfo, aboutText } from "@/data/config";

export default function Contact() {
  const { email, github, linkedin } = personalInfo;

  return (
    <section id="contact" className="mb-24 scroll-mt-20">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-semibold text-[var(--text)] mb-6"
      >
        Contact
      </motion.h2>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="max-w-xl"
      >
        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
          {aboutText.intro}
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            href={`mailto:${email}`}
            aria-label={`Email me at ${email}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm rounded-lg font-medium transition-colors"
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            {email}
          </a>

          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit my GitHub profile (opens in new tab)"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm rounded-lg font-medium transition-colors border border-[var(--border)]"
          >
            <Github className="w-4 h-4" aria-hidden="true" />
            GitHub
          </a>

          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit my LinkedIn profile (opens in new tab)"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm rounded-lg font-medium transition-colors border border-[var(--border)]"
          >
            <Linkedin className="w-4 h-4" aria-hidden="true" />
            LinkedIn
          </a>
        </div>
      </motion.div>
    </section>
  );
}
