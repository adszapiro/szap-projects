/**
 * Portfolio Configuration
 * Centralized configuration for personal info, skills, and contact details
 */

export const personalInfo = {
  name: "Alex Szapiro",
  initials: "AS",
  tagline: "Building at the intersection of finance and technology.",
  education: "Economics @ University of Michigan",
  email: "aszapiro@umich.edu",
  github: "https://github.com/adszapiro",
  linkedin: "https://www.linkedin.com/in/alex-szapiro/",
};

export const skills = [
  // Technical
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Tailwind CSS",
  "Git",
  "REST APIs",
  // Finance
  "Bloomberg Terminal",
  "FactSet",
  "Excel",
];

// Categorized skills with icons for the enhanced skills section
export const skillCategories = [
  {
    name: "Languages",
    icon: "Code2",
    skills: [
      { name: "TypeScript", icon: "FileCode2" },
      { name: "Python", icon: "Terminal" },
      { name: "JavaScript", icon: "Braces" },
      { name: "SQL", icon: "Database" },
    ],
  },
  {
    name: "Frameworks",
    icon: "Layers",
    skills: [
      { name: "React", icon: "Atom" },
      { name: "Next.js", icon: "Globe" },
      { name: "Node.js", icon: "Server" },
      { name: "Tailwind CSS", icon: "Paintbrush" },
    ],
  },
  {
    name: "Tools & Platforms",
    icon: "Wrench",
    skills: [
      { name: "Git", icon: "GitBranch" },
      { name: "Supabase", icon: "Database" },
      { name: "Vercel", icon: "Triangle" },
      { name: "REST APIs", icon: "Zap" },
    ],
  },
  {
    name: "Finance",
    icon: "TrendingUp",
    skills: [
      { name: "Bloomberg Terminal", icon: "Monitor" },
      { name: "FactSet", icon: "BarChart3" },
      { name: "Excel", icon: "Table" },
      { name: "Financial Modeling", icon: "Calculator" },
    ],
  },
];

export const aboutText = {
  intro: "Looking for internship opportunities in finance and tech. Open to connecting about projects, markets, or new opportunities.",
};

export const metadata = {
  title: "Alex Szapiro | Portfolio",
  description: "Full-stack developer and economics student at the University of Michigan. Building at the intersection of finance and technology.",
};
