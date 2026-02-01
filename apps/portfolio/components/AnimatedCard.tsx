"use client";

import { motion } from "framer-motion";
import { ReactNode, useState } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimatedCard({ children, className = "", delay = 0 }: AnimatedCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePosition({ x: 0, y: 0 });
      }}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${mousePosition.y * -10}deg) rotateY(${mousePosition.x * 10}deg)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.1s ease-out",
      }}
      className={`relative group ${className}`}
    >
      {/* Glow effect */}
      <div
        className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"
        style={{
          background: isHovered
            ? `radial-gradient(circle at ${(mousePosition.x + 0.5) * 100}% ${(mousePosition.y + 0.5) * 100}%, rgba(139, 92, 246, 0.3), transparent 50%)`
            : undefined,
        }}
      />
      {children}
    </motion.div>
  );
}
