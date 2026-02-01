"use client";

import { ExternalLink } from "lucide-react";

interface ProjectCardProps {
  title: string;
  description: string;
  tech: string;
  link?: string | null;
  status?: "live" | "coming-soon" | "in-progress";
  icon?: string;
}

export default function ProjectCard({ title, description, tech, link, status = "live", icon }: ProjectCardProps) {
  const isLive = status === "live" && link;
  
  // Status badge
  const StatusBadge = () => {
    if (status === "live" && link) {
      return (
        <span className="text-xs px-2 py-1 bg-green-900/50 text-green-300 rounded-full font-medium flex items-center gap-1 border border-green-700">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          Live
        </span>
      );
    }
    if (status === "in-progress") {
      return (
        <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-300 rounded-full font-medium border border-blue-700">
          In Progress
        </span>
      );
    }
    return (
      <span className="text-xs px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded-full font-medium border border-yellow-700">
        Coming Soon
      </span>
    );
  };

  // Default icon based on title
  const getDefaultIcon = () => {
    if (icon) return icon;
    if (title.includes("Todo")) return "✅";
    if (title.includes("Backtester") || title.includes("Trading")) return "📈";
    if (title.includes("Agent") || title.includes("AI")) return "🤖";
    if (title.includes("Bot")) return "💹";
    if (title.includes("Resume")) return "📄";
    if (title.includes("Wallet")) return "🔍";
    return "🚀";
  };
  
  const cardContent = (
    <div className="relative p-6 bg-gray-800/50 border border-gray-700 rounded-xl h-full transition-all duration-300 group-hover:border-purple-500/50 group-hover:bg-gray-800/80">
      {/* Header with icon and status */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-purple-900/50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-purple-700/50">
          <span className="text-2xl">{getDefaultIcon()}</span>
        </div>
        <StatusBadge />
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
        {title}
      </h3>
      
      <p className="text-gray-400 mb-4 line-clamp-3 text-sm">
        {description}
      </p>
      
      {/* Tech stack tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tech.split(", ").map((t) => (
          <span 
            key={t}
            className="text-xs px-2 py-1 bg-gray-700/50 text-gray-400 rounded border border-gray-600"
          >
            {t}
          </span>
        ))}
      </div>
      
      {/* View Project link for live projects */}
      {isLive && (
        <div className="mt-auto pt-4 border-t border-gray-700 flex items-center gap-2 text-purple-400 text-sm font-medium group-hover:text-purple-300">
          View Project
          <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      )}
    </div>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="group block h-full">
        {cardContent}
      </a>
    );
  }

  return (
    <div className="group h-full">
      {cardContent}
    </div>
  );
}
