"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, ArrowRight } from "lucide-react";
import type { Project } from "@/data/projects";

interface ProjectAccordionProps {
  project: Project;
}

export default function ProjectAccordion({ project }: ProjectAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="border-b border-[var(--border)] group/accordion">
      <h3>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="w-full py-4 flex items-center justify-between text-left cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <span className="text-[var(--text)] font-medium group-hover:text-[var(--accent)] transition-all duration-300 group-hover:translate-x-1">
              {project.title}
            </span>
            {project.status === "live" && (project.link || project.links) && (
              <span 
                className="relative flex h-2 w-2"
                aria-label="Project is live"
                role="status"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <ChevronDown 
              className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors"
              aria-hidden="true"
            />
          </motion.div>
        </button>
      </h3>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={`${panelId}-label`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-0">
              <motion.p 
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3"
              >
                {project.description}
              </motion.p>
              
              <motion.div 
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap gap-2 mb-3" 
                role="list" 
                aria-label="Technologies used"
              >
                {project.tech.split(", ").map((t, index) => (
                  <motion.span 
                    key={t}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 + index * 0.03 }}
                    role="listitem"
                    className="text-xs px-2 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded border border-[var(--border)] transition-all duration-200 hover:border-[var(--accent)] hover:text-[var(--text)]"
                  >
                    {t}
                  </motion.span>
                ))}
              </motion.div>

              {/* Multiple links (dropdown style) */}
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {project.links && project.links.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {project.links.map((link) => (
                      link.url.startsWith("/") ? (
                        <Link
                          key={link.label}
                          href={link.url}
                          aria-label={`${link.label} for ${project.title}`}
                          className="group/link inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text)] border border-[var(--border)] transition-all duration-300 hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-md"
                        >
                          {link.label}
                          <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
                        </Link>
                      ) : (
                        <a
                          key={link.label}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${link.label} for ${project.title} (opens in new tab)`}
                          className="group/link inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text)] border border-[var(--border)] transition-all duration-300 hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-md"
                        >
                          {link.label}
                          <ExternalLink className="w-3 h-3 transition-transform group-hover/link:rotate-12" aria-hidden="true" />
                        </a>
                      )
                    ))}
                  </div>
                ) : project.link ? (
                  project.link.startsWith("/") ? (
                    // Internal link - use Next.js Link for client-side navigation
                    <Link
                      href={project.link}
                      aria-label={`View ${project.title} dashboard`}
                      className="group/link inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-[var(--accent)] text-white transition-all duration-300 hover:shadow-lg hover:shadow-[var(--accent)]/25 hover:-translate-y-0.5"
                    >
                      View Live Dashboard
                      <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                  ) : (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${project.title} project (opens in new tab)`}
                      className="group/link inline-flex items-center gap-2 text-sm text-[var(--accent)] transition-all duration-200 hover:gap-3"
                    >
                      View Project
                      <ExternalLink className="w-3 h-3 transition-transform group-hover/link:rotate-12" aria-hidden="true" />
                    </a>
                  )
                ) : null}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
