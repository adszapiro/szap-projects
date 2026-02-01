"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Three.js
const Hero3D = dynamic(() => import("./Hero3D"), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900" />
});

export default function Hero() {
  const name = "Alex Szapiro";
  const title = "School of Information Student @ University of Michigan";
  const bio = "Passionate about the intersection of finance, technology, and entrepreneurship. Building my skills in software development while leveraging my background in economics and investing.";

  return (
    <section id="home" className="relative text-center mb-20 pt-20 min-h-[80vh] flex flex-col justify-center">
      {/* 3D Background */}
      <Hero3D />
      
      {/* Content with animations */}
      <div className="relative z-10">
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg text-gray-400 mb-4"
        >
          Welcome to my portfolio
        </motion.p>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold text-white mb-4"
        >
          Hi, I&apos;m{" "}
          <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
            {name}
          </span>
        </motion.h1>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-2xl md:text-3xl text-gray-300 mb-6"
        >
          {title}
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xl text-gray-400 max-w-2xl mx-auto mb-8"
        >
          {bio}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-wrap justify-center gap-4"
        >
          <a
            href="#projects"
            className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-medium transition-all hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
          >
            View My Work
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
          </a>
          <a
            href="/resume"
            className="px-8 py-4 border border-gray-600 text-gray-300 rounded-xl hover:bg-white/5 hover:border-purple-500 transition-all font-medium"
          >
            View Resume
          </a>
          <a
            href="#contact"
            className="px-8 py-4 border border-gray-600 text-gray-300 rounded-xl hover:bg-white/5 hover:border-cyan-500 transition-all font-medium"
          >
            Get In Touch
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center"
        >
          <motion.div 
            animate={{ y: [0, 12, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-3 bg-purple-500 rounded-full mt-2"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
