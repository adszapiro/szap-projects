// ============================================
// SkillBadge Component - Polished Version
// ============================================

interface SkillBadgeProps {
  skill: string;
}

export default function SkillBadge({ skill }: SkillBadgeProps) {
  return (
    <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/50 dark:to-indigo-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-200 dark:border-blue-700 hover:scale-105 hover:shadow-md transition-all duration-200 cursor-default">
      {skill}
    </span>
  );
}

// New Tailwind concepts:
// 1. "bg-gradient-to-r from-X to-Y" - Creates a gradient from left to right
// 2. "hover:scale-105" - Slightly enlarges on hover (105% of original size)
// 3. "cursor-default" - Shows default cursor (arrow) instead of pointer
