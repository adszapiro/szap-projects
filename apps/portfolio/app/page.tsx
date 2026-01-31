// ============================================
// Main Page - Assembling All Components
// ============================================
// This is where we bring together all our components
// Think of it like the final assembly of LEGO pieces

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import About from "@/components/About";
import SkillBadge from "@/components/SkillBadge";
import ProjectCard from "@/components/ProjectCard";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  // ============================================
  // Data - In a real app, this might come from a database
  // ============================================
  // Technical skills I'm building
  const techSkills = [
    "JavaScript",
    "TypeScript", 
    "React",
    "Next.js",
    "Node.js",
    "Tailwind CSS",
    "Git",
    "HTML/CSS"
  ];

  // Finance & business skills
  const businessSkills = [
    "Financial Modeling",
    "Excel",
    "Bloomberg Terminal",
    "FactSet",
    "Equity Research",
    "ESG Analysis",
    "Spanish (Proficient)"
  ];

  // Projects array - live links to deployed apps!
  const projects = [
    {
      title: "Portfolio Website",
      description: "My personal portfolio built with Next.js and Tailwind CSS. A showcase of my journey into software development.",
      tech: "Next.js, React, Tailwind CSS, TypeScript",
      link: "https://portfolio-adszapiro.vercel.app"
    },
    {
      title: "Todo App",
      description: "A task management app with categories, priorities, and local storage persistence. Add tasks, mark complete, filter by status.",
      tech: "React, TypeScript, Local Storage",
      link: "https://alexszapiro-to-do.vercel.app"
    },
    {
      title: "Expense Tracker",
      description: "Track spending by category with visual charts and budget goals. Coming soon!",
      tech: "Next.js, React, Chart.js",
      link: null // Will add when built
    },
    {
      title: "Investment Tracker",
      description: "Monitor portfolio performance, track holdings, and analyze returns. Coming soon!",
      tech: "Next.js, React, Finance APIs",
      link: null // Will add when built
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header - Fixed navigation at top */}
      <Header />

      {/* Main content area */}
      <main className="max-w-4xl mx-auto px-6 py-20">
        
        {/* Hero Section - Introduction */}
        <Hero />

        {/* About Section - Your story */}
        <About />

        {/* Skills Section */}
        <section id="skills" className="mb-20 scroll-mt-20">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Skills & Technologies
          </h2>
          
          {/* Tech Skills */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
              Technical Skills (Building)
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {techSkills.map((skill) => (
                <SkillBadge key={skill} skill={skill} />
              ))}
            </div>
          </div>

          {/* Business & Finance Skills */}
          <div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
              Finance & Business
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {businessSkills.map((skill) => (
                <SkillBadge key={skill} skill={skill} />
              ))}
            </div>
          </div>
        </section>

        {/* Projects Section */}
        <section id="projects" className="mb-20 scroll-mt-20">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Featured Projects
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.title}
                title={project.title}
                description={project.description}
                tech={project.tech}
                link={project.link}
              />
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <Contact />

      </main>

      {/* Footer - Bottom of page */}
      <Footer />
    </div>
  );
}
