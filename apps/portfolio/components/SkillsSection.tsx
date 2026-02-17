"use client";

import { motion } from "framer-motion";
import {
  Code2,
  Layers,
  Wrench,
  TrendingUp,
  FileCode2,
  Terminal,
  Braces,
  Database,
  Globe,
  Server,
  Paintbrush,
  GitBranch,
  Triangle,
  Zap,
  Monitor,
  BarChart3,
  Table,
  Calculator,
  Atom,
  type LucideIcon,
} from "lucide-react";
import { skillCategories } from "@/data/config";

const iconMap: Record<string, LucideIcon> = {
  Code2, Layers, Wrench, TrendingUp, FileCode2, Terminal, Braces,
  Database, Globe, Server, Paintbrush, GitBranch, Triangle, Zap,
  Monitor, BarChart3, Table, Calculator, Atom,
};

function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || Code2;
}

export default function SkillsSection() {
  return (
    <section id="skills" className="mb-24 scroll-mt-20">
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="font-[family-name:var(--font-display)] text-3xl italic text-[var(--text)] mb-8"
      >
        Skills & Technologies
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {skillCategories.map((category, categoryIndex) => {
          const CategoryIcon = getIcon(category.icon);
          return (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: categoryIndex * 0.08 }}
              className="group p-5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl hover:border-[var(--accent)]/30 transition-colors duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center group-hover:border-[var(--accent)]/30 transition-colors duration-300">
                  <CategoryIcon className="w-5 h-5 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <h3 className="text-base font-medium text-[var(--text)]">
                  {category.name}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {category.skills.map((skill) => {
                  const SkillIcon = getIcon(skill.icon);
                  return (
                    <div
                      key={skill.name}
                      className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5 transition-colors duration-200 cursor-default"
                    >
                      <SkillIcon className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)] truncate">
                        {skill.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
