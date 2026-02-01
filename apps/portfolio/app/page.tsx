"use client";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import ProjectCard from "@/components/ProjectCard";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getFeaturedProjects, getStandardProjects } from "@/data/projects";
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

  const featuredProjects = getFeaturedProjects();
  const standardProjects = getStandardProjects();

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>
      
      <Header />

      <main id="main-content" className="max-w-4xl mx-auto px-6" role="main">
        <Hero />

        <About />

        {/* Skills - Simple inline list */}
        <section id="skills" className="mb-24 scroll-mt-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold text-white mb-6"
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
                className="px-3 py-1.5 bg-gray-800 text-gray-400 text-sm rounded-lg border border-gray-700"
              >
                {skill}
              </span>
            ))}
          </motion.div>
        </section>

        {/* Projects Section - Two tiers */}
        <section id="projects" className="mb-24 scroll-mt-20" aria-labelledby="projects-heading">
          <motion.h2 
            id="projects-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl font-semibold text-white mb-8"
          >
            Projects
          </motion.h2>

          {/* Featured Projects - 2x2 grid with more detail */}
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            {featuredProjects.map((project, i) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <ProjectCard
                  title={project.title}
                  description={project.description}
                  tech={project.tech}
                  link={project.link}
                  status={project.status}
                  featured={true}
                />
              </motion.div>
            ))}
          </div>

          {/* Standard Projects - Compact 3-column grid */}
          <div className="grid gap-3 md:grid-cols-3">
            {standardProjects.map((project, i) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
              >
                <ProjectCard
                  title={project.title}
                  description={project.description}
                  tech={project.tech}
                  link={project.link}
                  status={project.status}
                />
              </motion.div>
            ))}
          </div>
        </section>

        <Contact />
      </main>

      <Footer />
    </div>
  );
}

