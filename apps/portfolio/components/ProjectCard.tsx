"use client";

import { 
  ExternalLink, 
  LineChart, 
  FileText, 
  Search, 
  Bot, 
  Terminal, 
  Code2, 
  Zap,
  CheckSquare,
  Activity,
  Globe,
  type LucideIcon
} from "lucide-react";
import { useCallback } from "react";

interface ProjectCardProps {
  title: string;
  description: string;
  tech: string;
  link?: string | null;
  status?: "live" | "coming-soon" | "in-progress";
  icon?: string;
  featured?: boolean;
}

// Map project types to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  "Backtester": LineChart,
  "Trading": LineChart,
  "Resume": FileText,
  "Wallet": Search,
  "Agent": Bot,
  "Quant": Bot,
  "CLI": Terminal,
  "Snippet": Code2,
  "API": Zap,
  "Todo": CheckSquare,
  "DevPulse": Activity,
  "Markdown": FileText,
};

function getIconForProject(title: string): LucideIcon {
  for (const [key, Icon] of Object.entries(iconMap)) {
    if (title.includes(key)) return Icon;
  }
  return Globe;
}

export default function ProjectCard({ 
  title, 
  description, 
  tech, 
  link, 
  status = "live",
  featured = false 
}: ProjectCardProps) {
  const isLive = status === "live" && link;
  const Icon = getIconForProject(title);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (link && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      window.open(link, "_blank", "noopener,noreferrer");
    }
  }, [link]);
  
  // Simplified status indicator
  const StatusDot = () => {
    if (status === "live" && link) {
      return <span className="w-2 h-2 bg-green-500 rounded-full" title="Live" />;
    }
    if (status === "in-progress") {
      return <span className="w-2 h-2 bg-yellow-500 rounded-full" title="In Progress" />;
    }
    return <span className="w-2 h-2 bg-gray-500 rounded-full" title="Coming Soon" />;
  };

  // Get primary tech (first 2-3 items)
  const primaryTech = tech.split(", ").slice(0, 3);
  
  const cardContent = (
    <div className={`relative p-5 bg-[#111827] border border-gray-800 rounded-lg h-full transition-all duration-200 group-hover:border-gray-700 group-hover:bg-[#1a2332] ${featured ? 'ring-1 ring-blue-500/20' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-white">
              {title}
            </h3>
            <StatusDot />
          </div>
        </div>
        {isLive && (
          <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
        )}
      </div>
      
      <p className="text-gray-500 mb-4 line-clamp-2 text-sm leading-relaxed">
        {description}
      </p>
      
      {/* Tech stack - simplified */}
      <div className="flex flex-wrap gap-1.5">
        {primaryTech.map((t) => (
          <span 
            key={t}
            className="text-xs px-2 py-0.5 bg-gray-800 text-gray-500 rounded"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );

  if (link) {
    return (
      <a 
        href={link} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1a] rounded-lg"
        aria-label={`View ${title} project`}
        onKeyDown={handleKeyDown}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div 
      className="group h-full"
      role="article"
      aria-label={title}
    >
      {cardContent}
    </div>
  );
}
