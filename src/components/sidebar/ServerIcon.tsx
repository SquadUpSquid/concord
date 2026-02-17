import { useState, useEffect } from "react";

interface ServerIconProps {
  name: string;
  avatarUrl: string | null;
  isSelected: boolean;
  unreadCount: number;
  onClick: () => void;
}

const COLORS = [
  "#5865f2", "#57f287", "#fee75c", "#eb459e",
  "#ed4245", "#f47b67", "#45ddc0", "#5dadec",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function ServerIcon({
  name,
  avatarUrl,
  isSelected,
  unreadCount,
  onClick,
}: ServerIconProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when URL changes
  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const showImage = avatarUrl && !imgError;

  return (
    <div className="group relative">
      {/* Selection indicator pill */}
      <div
        className={`absolute -left-1 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-text-primary transition-all ${
          isSelected ? "h-10" : unreadCount > 0 ? "h-2" : "h-0 group-hover:h-5"
        }`}
      />

      {/* Tooltip */}
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-bg-floating px-3 py-2 text-sm font-medium text-text-primary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {name}
      </div>

      <button
        onClick={onClick}
        className={`relative flex h-12 w-12 items-center justify-center overflow-hidden transition-all ${
          isSelected
            ? "rounded-xl bg-accent"
            : "rounded-2xl bg-bg-primary hover:rounded-xl hover:bg-accent"
        }`}
        title={name}
      >
        {showImage ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-sm font-medium text-white"
            style={{ backgroundColor: isSelected ? undefined : getColor(name) }}
          >
            {initials}
          </span>
        )}
      </button>

      {/* Unread badge */}
      {unreadCount > 0 && !isSelected && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white ring-2 ring-bg-tertiary">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </div>
  );
}
