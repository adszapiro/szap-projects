"use client";

import { motion } from "framer-motion";
import { Mail, Github, Linkedin } from "lucide-react";

export default function Contact() {
  const email = "aszapiro@umich.edu";
  const github = "https://github.com/adszapiro";
  const linkedin = "https://www.linkedin.com/in/alex-szapiro/";

  return (
    <section id="contact" className="mb-20 scroll-mt-20">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-3xl font-bold text-white mb-8 text-center"
      >
        Get In Touch
      </motion.h2>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="max-w-2xl mx-auto text-center"
      >
        <p className="text-lg text-gray-400 mb-8">
          I&apos;m currently looking for internship opportunities in finance and tech, 
          and would love to connect! Whether you have a question, want to collaborate, 
          or just want to chat about markets, technology, or go-kart racing, feel free to reach out.
        </p>

        {/* Email button */}
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-medium text-lg mb-8 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          <Mail className="w-5 h-5" />
          Say Hello
        </a>

        {/* Social links */}
        <div className="flex justify-center gap-6">
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <Github className="w-5 h-5" />
            <span>GitHub</span>
            <span className="w-0 h-0.5 bg-white transition-all group-hover:w-4" />
          </a>

          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <Linkedin className="w-5 h-5" />
            <span>LinkedIn</span>
            <span className="w-0 h-0.5 bg-white transition-all group-hover:w-4" />
          </a>

          <a
            href={`mailto:${email}`}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
          >
            <Mail className="w-5 h-5" />
            <span>Email</span>
            <span className="w-0 h-0.5 bg-white transition-all group-hover:w-4" />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
