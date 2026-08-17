import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  count: number | string;
  icon: ReactNode;
  gradient: string;
  iconBg: string;
  textColor: string;
  onClick?: () => void;
}

export function StatCard({ title, count, icon, gradient, iconBg, textColor, onClick }: StatCardProps) {
  return (
    <div
      className={`relative group bg-gradient-to-r ${gradient} p-3 md:p-6 rounded-lg text-white hover:shadow-lg hover:shadow-gray-900/50 transition-all duration-200 ${onClick ? "cursor-pointer hover:scale-[1.01]" : ""} overflow-hidden`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="relative z-10 flex-1 min-w-0">
          <p className={`${textColor} text-sm font-medium`}>{title}</p>
          <p className="text-2xl md:text-3xl font-bold truncate">
            {typeof count === "number" ? count.toLocaleString() : count}
          </p>
        </div>
        <div className={`absolute blur-sm opacity-50 group-hover:opacity-70 top-1/2 -translate-y-1/2 right-3 p-3 ${iconBg} bg-opacity-30 rounded-full shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
