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
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left transition-colors ${
        isSelected
          ? "bg-bg-active text-text-primary"
          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      <span className="text-lg text-text-muted">#</span>
      <span className="flex-1 truncate text-sm">{name}</span>
      {unreadCount > 0 && (
        <span className="rounded-full bg-red px-1.5 py-0.5 text-xs font-bold text-white">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
