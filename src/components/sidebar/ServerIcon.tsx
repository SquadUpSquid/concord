interface ServerIconProps {
  name: string;
  avatarUrl: string | null;
  isSelected: boolean;
  unreadCount: number;
  onClick: () => void;
}

export function ServerIcon({
  name,
  avatarUrl,
  isSelected,
  unreadCount,
  onClick,
}: ServerIconProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group relative">
      {/* Selection indicator pill */}
      <div
        className={`absolute -left-1 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-text-primary transition-all ${
          isSelected ? "h-10" : unreadCount > 0 ? "h-2" : "h-0 group-hover:h-5"
        }`}
      />

      <button
        onClick={onClick}
        className={`flex h-12 w-12 items-center justify-center overflow-hidden transition-all ${
          isSelected
            ? "rounded-xl bg-accent"
            : "rounded-2xl bg-bg-primary hover:rounded-xl hover:bg-accent"
        }`}
        title={name}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-text-primary">{initials}</span>
        )}
      </button>
    </div>
  );
}
