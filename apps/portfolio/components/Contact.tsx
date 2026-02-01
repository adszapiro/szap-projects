"use client";

import { motion } from "framer-motion";
import { Mail, Github, Linkedin } from "lucide-react";

export default function Contact() {
  const email = "aszapiro@umich.edu";
  const github = "https://github.com/adszapiro";
  const linkedin = "https://www.linkedin.com/in/alex-szapiro/";

  return (
    <section id="contact" className="mb-24 scroll-mt-20">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-2xl font-semibold text-white mb-6"
      >
        Contact
      </motion.h2>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="max-w-xl"
      >
        <p className="text-gray-400 mb-6 leading-relaxed">
          Looking for internship opportunities in finance and tech. 
          Open to connecting about projects, markets, or new opportunities.
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            {email}
          </a>

          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg font-medium transition-colors border border-gray-700"
          >
            <Github className="w-4 h-4" />
            GitHub
          </a>

          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg font-medium transition-colors border border-gray-700"
          >
            <Linkedin className="w-4 h-4" />
            LinkedIn
          </a>
        </div>
      </motion.div>
    </section>
  );
}
