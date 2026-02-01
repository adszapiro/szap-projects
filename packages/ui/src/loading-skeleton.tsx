"use client";

interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "rounded";
  lines?: number;
}

export function LoadingSkeleton({
  width = "100%",
  height = "1rem",
  className = "",
  variant = "rectangular",
  lines = 1,
}: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-gray-700/50";

  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "",
    rounded: "rounded-lg",
  };

  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              ...style,
              width: i === lines - 1 ? "75%" : style.width,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Card skeleton for project cards
export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`p-6 rounded-xl bg-gray-800/50 border border-gray-700/50 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <LoadingSkeleton width={40} height={40} variant="rounded" />
        <LoadingSkeleton width={60} height={24} variant="rounded" />
      </div>
      <LoadingSkeleton height={24} className="mb-2" variant="rounded" />
      <LoadingSkeleton lines={2} height={16} variant="text" />
      <div className="flex gap-2 mt-4">
        <LoadingSkeleton width={60} height={20} variant="rounded" />
        <LoadingSkeleton width={80} height={20} variant="rounded" />
        <LoadingSkeleton width={70} height={20} variant="rounded" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-700/50">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <LoadingSkeleton height={20} variant="rounded" />
        </td>
      ))}
    </tr>
  );
}
