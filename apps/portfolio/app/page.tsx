"use client";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import ProjectCardGrid from "@/components/ProjectCardGrid";
import SkillsSection from "@/components/SkillsSection";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getAllProjects } from "@/data/projects";
import { motion } from "framer-motion";

export default function Home() {
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

      <main id="main-content" role="main">
        {/* Hero and About sections - narrower width */}
        <div className="max-w-3xl mx-auto px-6">
          <Hero />
          <About />
        </div>

        {/* Skills Section - wider for the grid */}
        <div className="max-w-4xl mx-auto px-6">
          <SkillsSection />
        </div>

        {/* Projects Section - wider for impressive cards */}
        <section
          id="projects"
          className="mb-24 scroll-mt-20 max-w-5xl mx-auto px-6"
          aria-labelledby="projects-heading"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h2
              id="projects-heading"
              className="text-2xl font-semibold text-[var(--text)] mb-2"
            >
              Featured Projects
            </h2>
            <p className="text-[var(--text-secondary)]">
              A selection of projects I've built, from AI-powered trading systems to developer tools.
            </p>
          </motion.div>

          <ProjectCardGrid projects={projects} />
        </section>

        {/* Contact Section */}
        <div className="max-w-3xl mx-auto px-6">
          <Contact />
        </div>
      </main>

      <Footer />
    </div>
  );
}
