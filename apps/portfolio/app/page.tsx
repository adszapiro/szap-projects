"use client";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import ProjectAccordion from "@/components/ProjectAccordion";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getAllProjects } from "@/data/projects";
import { motion } from "framer-motion";

export default function Home() {
  const skills = [
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "Python",
    "Tailwind",
    "Git",
    "APIs",
  ];

  const projects = getAllProjects();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>
      
      <Header />

      <main id="main-content" className="max-w-3xl mx-auto px-6" role="main">
        <Hero />

        <About />

        <section id="skills" className="mb-24 scroll-mt-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold text-[var(--text)] mb-6"
          >
            Skills
          </motion.h2>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2"
          >
            {skills.map((skill) => (
              <span 
                key={skill}
                className="px-3 py-1.5 bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm rounded-lg border border-[var(--border)]"
              >
                {skill}
              </span>
            ))}
          </motion.div>
        </section>

        <section id="projects" className="mb-24 scroll-mt-20" aria-labelledby="projects-heading">
          <motion.h2 
            id="projects-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold text-[var(--text)] mb-4"
          >
            Projects
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="border-t border-[var(--border)]"
          >
            {projects.map((project) => (
              <ProjectAccordion key={project.title} project={project} />
            ))}
          </motion.div>
        </section>

        <Contact />
      </main>

      <Footer />
    </div>
  );
}

