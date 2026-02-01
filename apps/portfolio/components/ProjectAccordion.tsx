"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { Project } from "@/data/projects";

interface ProjectAccordionProps {
  project: Project;
}

export default function ProjectAccordion({ project }: ProjectAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[var(--border)]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left cursor-pointer group"
      >
        <div className="flex items-center gap-4">
          <span className="text-[var(--text)] font-medium group-hover:text-[var(--accent)] transition-colors">
            {project.title}
          </span>
          {project.status === "live" && project.link && (
            <span className="w-2 h-2 bg-green-500 rounded-full" title="Live" />
          )}
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isOpen && (
        <div className="pb-4 pl-0">
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-3">
            {project.description}
          </p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {project.tech.split(", ").map((t) => (
              <span 
                key={t}
                className="text-xs px-2 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded border border-[var(--border)]"
              >
                {t}
              </span>
            ))}
          </div>

          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--accent)] hover:underline"
            >
              View Project
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
