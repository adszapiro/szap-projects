"use client";

import { motion } from "framer-motion";

export default function About() {
  const stats = [
    { value: "2028", label: "Expected Grad" },
    { value: "$15K+", label: "Business Revenue" },
    { value: "200+", label: "Clients Served" },
    { value: "4.44", label: "HS GPA" },
  ];

  return (
    <section id="about" className="mb-20 scroll-mt-20">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-bold text-white mb-8 text-center"
      >
        About Me
      </motion.h2>

      <div className="max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-gray-400 space-y-4"
        >
          <p className="text-lg">
            I&apos;m a first-year student at the University of Michigan studying Economics 
            with a minor in Real Estate, while exploring my growing interest in 
            technology and software development through the School of Information.
          </p>
          
          <p className="text-lg">
            My background spans finance, entrepreneurship, and technology. I&apos;ve founded 
            a luxury goods reselling business, led investment clubs, and worked as a 
            Private Credit Intern at Churchill Real Estate. Now I&apos;m expanding my skill 
            set into software engineering to combine my business acumen with technical abilities.
          </p>

          <p className="text-lg">
            When I&apos;m not coding or analyzing markets, you can find me at the go-kart 
            track, watching college athletics and the NFL, playing padel, or adding 
            to my vinyl collection.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {stats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-purple-500/50 transition-colors"
            >
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
