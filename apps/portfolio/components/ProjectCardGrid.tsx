"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ExternalLink,
  Bot,
  FileText,
  CheckSquare,
  LineChart,
  Terminal,
  Globe,
  Github,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import type { Project, ProjectBadge } from "@/data/projects";

const techIcons: Record<string, LucideIcon> = {
  "Node.js": Terminal,
  TypeScript: FileText,
  Supabase: Globe,
  "Next.js": Globe,
  Python: Terminal,
  React: Globe,
};

const projectIcons: Record<string, LucideIcon> = {
  Bot: Bot,
  FileText: FileText,
  CheckSquare: CheckSquare,
  LineChart: LineChart,
  Terminal: Terminal,
  Globe: Globe,
};

interface ProjectCardGridProps {
  projects: Project[];
}

function BadgeComponent({ badge }: { badge: ProjectBadge }) {
  const variants = {
    primary: "bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20",
    secondary: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
    accent: "bg-[var(--accent-warm)]/10 text-[var(--accent-warm)] border-[var(--accent-warm)]/20",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${variants[badge.variant]}`}
    >
      {badge.label}
    </span>
  );
}

function ProjectCard({ project, index, featured }: { project: Project; index: number; featured?: boolean }) {
  const Icon = project.icon
    ? projectIcons[project.icon] || Globe
    : Globe;

  const isInternalLink = project.link?.startsWith("/");
  const primaryTechs = project.tech.split(", ").slice(0, 4);

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      className="group relative h-full"
    >
      {/* Card */}
      <div className={`relative h-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden transition-colors duration-300 group-hover:border-[var(--accent)]/50 ${featured ? "flex flex-col md:flex-row" : ""}`}>
        {/* Left accent bar */}
        <div className="absolute top-0 left-0 w-[3px] h-full bg-[var(--accent)]/40 group-hover:bg-[var(--accent)] transition-colors duration-300" />

        <div className={`p-6 ${featured ? "md:flex-1" : ""} pl-7`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                  {project.title}
                </h3>
                {project.status === "live" && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-[var(--positive)] rounded-full" />
                    <span className="text-xs text-[var(--positive)] font-medium">
                      Live
                    </span>
                  </div>
                )}
              </div>
            </div>

            {project.link && (
              <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-colors duration-300">
                <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-white transition-colors" />
              </div>
            )}
          </div>

          {/* Badges */}
          {project.badges && project.badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {project.badges.map((badge) => (
                <BadgeComponent key={badge.label} badge={badge} />
              ))}
            </div>
          )}

          {/* Description */}
          <p className={`text-[var(--text-secondary)] text-sm leading-relaxed mb-4 ${featured ? "" : "line-clamp-3"}`}>
            {project.description}
          </p>

          {/* Tech Stack */}
          <div className="flex flex-wrap gap-2 mb-4">
            {primaryTechs.map((tech) => {
              const TechIcon = techIcons[tech] || Terminal;
              return (
                <div
                  key={tech}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)]"
                >
                  <TechIcon className="w-3 h-3" />
                  {tech}
                </div>
              );
            })}
          </div>

          {/* Footer with GitHub link */}
          {project.repo && (
            <div className="pt-4 border-t border-[var(--border)]">
              <span
                role="link"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(project.repo, "_blank", "noopener,noreferrer");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(project.repo, "_blank", "noopener,noreferrer");
                  }
                }}
                className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                <Github className="w-3.5 h-3.5" />
                View Source
                <ExternalLink className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (project.link) {
    if (isInternalLink) {
      return (
        <Link
          href={project.link}
          className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded-2xl"
        >
          {cardContent}
        </Link>
      );
    }
    return (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 rounded-2xl"
      >
        {cardContent}
      </a>
    );
  }

  return cardContent;
}

export default function ProjectCardGrid({ projects }: ProjectCardGridProps) {
  if (projects.length === 0) return null;

  const [first, ...rest] = projects;

  return (
    <div className="space-y-6">
      {/* Featured first project — full width */}
      <ProjectCard project={first} index={0} featured />

      {/* Remaining projects — 2 column grid */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rest.map((project, index) => (
            <ProjectCard key={project.title} project={project} index={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
