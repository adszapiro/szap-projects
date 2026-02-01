"use client";

interface SkillBadgeProps {
  skill: string;
}

export default function SkillBadge({ skill }: SkillBadgeProps) {
  return (
    <span className="px-4 py-2 bg-gray-800/50 text-gray-300 rounded-full text-sm font-medium border border-gray-700 hover:border-purple-500 hover:text-purple-300 hover:bg-purple-900/20 transition-all duration-200 cursor-default">
      {skill}
    </span>
  );
}
