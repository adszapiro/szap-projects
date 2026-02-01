// ============================================
// ProjectCard Component - With Links Support
// ============================================

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
        <div className="absolute top-4 right-4">
          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full font-medium flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
      );
    }
    if (status === "in-progress") {
      return (
        <div className="absolute top-4 right-4">
          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">
            In Progress
          </span>
        </div>
      );
    }
    return (
      <div className="absolute top-4 right-4">
        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full font-medium">
          Coming Soon
        </span>
      </div>
    );
  };

  // Default icon based on title
  const getDefaultIcon = () => {
    if (icon) return icon;
    if (title.includes("Todo")) return "✅";
    if (title.includes("Backtester") || title.includes("Trading")) return "📈";
    if (title.includes("Agent") || title.includes("AI")) return "🤖";
    if (title.includes("Bot")) return "💹";
    return "🚀";
  };
  
  // The card content - same whether it's a link or not
  const cardContent = (
    <>
      {/* Status Badge */}
      <StatusBadge />
      
      {/* Project icon */}
      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <span className="text-2xl">{getDefaultIcon()}</span>
      </div>
      
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      
      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
        {description}
      </p>
      
      {/* Tech stack tags */}
      <div className="flex flex-wrap gap-2">
        {tech.split(", ").map((t) => (
          <span 
            key={t}
            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
          >
            {t}
          </span>
        ))}
      </div>
      
      {/* View Project link for live projects */}
      {isLive && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:underline">
            View Project →
          </span>
        </div>
      )}
    </>
  );

  // Wrapper - either a link or a div
  const wrapperClasses = `group relative p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 ${isLive ? 'cursor-pointer' : ''}`;

  if (link) {
    return (
      <a href={link} className={wrapperClasses}>
        {cardContent}
      </a>
    );
  }

  return (
    <div className={wrapperClasses}>
      {cardContent}
    </div>
  );
}
