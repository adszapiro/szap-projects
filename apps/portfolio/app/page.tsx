"use client";

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import SkillBadge from "@/components/SkillBadge";
import ProjectCard from "@/components/ProjectCard";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import AnimatedCard from "@/components/AnimatedCard";
import { getFeaturedProjects } from "@/data/projects";
import { motion } from "framer-motion";

export default function Home() {
  // Technical skills
  const techSkills = [
    "JavaScript",
    "TypeScript", 
    "React",
    "Next.js",
    "Node.js",
    "Tailwind CSS",
    "Three.js",
    "Git",
  ];

  // Finance & business skills
  const businessSkills = [
    "Excel",
    "FactSet",
    "Data Analysis",
    "Spanish (Proficient)"
  ];

  // Get featured projects from centralized data file
  const projects = getFeaturedProjects();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header - Fixed navigation at top */}
      <Header />

      {/* Main content area */}
      <main className="max-w-5xl mx-auto px-6">
        
        {/* Hero Section - With 3D background */}
        <Hero />

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <About />
        </motion.div>

        {/* Skills Section */}
        <section id="skills" className="mb-20 scroll-mt-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-white mb-8 text-center"
          >
            Skills & Technologies
          </motion.h2>
          
          {/* Tech Skills */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h3 className="text-xl font-semibold text-gray-300 mb-4 text-center">
              Technical Skills
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {techSkills.map((skill, i) => (
                <motion.div
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <SkillBadge skill={skill} />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Business & Finance Skills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold text-gray-300 mb-4 text-center">
              Finance & Business
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {businessSkills.map((skill, i) => (
                <motion.div
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <SkillBadge skill={skill} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="mb-20 scroll-mt-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-white mb-8 text-center"
          >
            Featured Projects
          </motion.h2>
          <div className="grid gap-6 md:grid-cols-2">
            {projects.map((project, i) => (
              <AnimatedCard key={project.title} delay={i * 0.1}>
                <ProjectCard
                  title={project.title}
                  description={project.description}
                  tech={project.tech}
                  link={project.link}
                  status={project.status}
                  icon={project.icon}
                />
              </AnimatedCard>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Contact />
        </motion.div>

      </main>

      {/* Footer - Bottom of page */}
      <Footer />
    </div>
  );
}

