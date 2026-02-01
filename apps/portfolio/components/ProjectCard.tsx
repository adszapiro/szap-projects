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
  
  const StatusDot = () => {
    if (status === "live" && link) {
      return <span className="w-2 h-2 bg-green-500 rounded-full" title="Live" />;
    }
    if (status === "in-progress") {
      return <span className="w-2 h-2 bg-yellow-500 rounded-full" title="In Progress" />;
    }
    return <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full" title="Coming Soon" />;
  };

  const primaryTech = tech.split(", ").slice(0, 3);
  
  const cardContent = (
    <div className={`relative p-5 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg h-full transition-all duration-200 group-hover:border-[var(--text-muted)] ${featured ? 'ring-1 ring-[var(--accent)]/20' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center border border-[var(--border)]">
            <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-[var(--text)]">
              {title}
            </h3>
            <StatusDot />
          </div>
        </div>
        {isLive && (
          <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
        )}
      </div>
      
      <p className="text-[var(--text-muted)] mb-4 line-clamp-2 text-sm leading-relaxed">
        {description}
      </p>
      
      <div className="flex flex-wrap gap-1.5">
        {primaryTech.map((t) => (
          <span 
            key={t}
            className="text-xs px-2 py-0.5 bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded border border-[var(--border)]"
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
        className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-lg"
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
