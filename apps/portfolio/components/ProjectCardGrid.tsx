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

// Tech stack icons mapping
const techIcons: Record<string, LucideIcon> = {
  "Node.js": Terminal,
  TypeScript: FileText,
  Supabase: Globe,
  "Next.js": Globe,
  Python: Terminal,
  React: Globe,
};

// Project icons mapping
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
    primary:
      "bg-blue-500/10 text-blue-400 border-blue-500/20",
    secondary:
      "bg-slate-500/10 text-slate-400 border-slate-500/20",
    accent:
      "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${variants[badge.variant]}`}
    >
      {badge.label}
    </span>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const Icon = project.icon
    ? projectIcons[project.icon] || Globe
    : Globe;

  const isInternalLink = project.link?.startsWith("/");
  const primaryTechs = project.tech.split(", ").slice(0, 4);

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative h-full"
    >
      {/* Gradient background effect */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${project.gradient || "from-slate-500/10 to-slate-600/10"} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`}
      />

      {/* Card */}
      <div className="relative h-full p-6 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden transition-all duration-300 group-hover:border-[var(--accent)]/50 group-hover:shadow-xl group-hover:shadow-[var(--accent)]/5">
        {/* Top gradient line */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${project.gradient?.replace("/20", "/60") || "from-slate-500/60 to-slate-600/60"} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${project.gradient || "from-slate-500/20 to-slate-600/20"} flex items-center justify-center border border-[var(--border)] group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className="w-6 h-6 text-[var(--text)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                {project.title}
              </h3>
              {project.status === "live" && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-500 font-medium">
                    Live
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Link indicator */}
          {project.link && (
            <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] group-hover:bg-[var(--accent)] group-hover:border-[var(--accent)] transition-all duration-300">
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
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-4 line-clamp-3">
          {project.description}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 mb-4">
          {primaryTechs.map((tech) => {
            const TechIcon = techIcons[tech] || Terminal;
            return (
              <div
                key={tech}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] group-hover:border-[var(--text-muted)]/30 transition-colors"
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
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              View Source
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Wrap in appropriate link component
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {projects.map((project, index) => (
        <ProjectCard key={project.title} project={project} index={index} />
      ))}
    </div>
  );
}
