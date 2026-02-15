interface ChannelItemProps {
  name: string;
  unreadCount: number;
  isSelected: boolean;
  onClick: () => void;
}

export function ChannelItem({
  name,
  unreadCount,
  isSelected,
  onClick,
}: ChannelItemProps) {
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left transition-colors ${
        isSelected
          ? "bg-bg-active text-text-primary"
          : hasUnread
            ? "text-text-primary hover:bg-bg-hover"
            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      <span className="text-lg text-text-muted">#</span>
      <span className={`flex-1 truncate text-sm ${hasUnread && !isSelected ? "font-semibold" : ""}`}>
        {name}
      </span>
      {hasUnread && (
        <span className="min-w-[18px] rounded-full bg-red px-1.5 py-0.5 text-center text-xs font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
