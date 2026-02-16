import { useUiStore } from "@/stores/uiStore";
import { useCallStore } from "@/stores/callStore";
import type { ChannelType } from "@/stores/roomStore";

interface ChannelItemProps {
  roomId: string;
  name: string;
  channelType: ChannelType;
  unreadCount: number;
  isSelected: boolean;
  onClick: () => void;
}

function TextChannelIcon() {
  return <span className="text-lg text-text-muted">#</span>;
}

function VoiceChannelIcon({ active }: { active?: boolean }) {
  return (
    <svg className={`h-5 w-5 flex-shrink-0 ${active ? "text-green" : "text-text-muted"}`} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 004 7.46V22h2v-2.54a8.95 8.95 0 006 0V22h2v-2.54A9 9 0 0021 12v-2h-2z" />
    </svg>
  );
}

export function ChannelItem({
  roomId,
  name,
  channelType,
  unreadCount,
  isSelected,
  onClick,
}: ChannelItemProps) {
  const openContextMenu = useUiStore((s) => s.openContextMenu);
  const activeCallRoomId = useCallStore((s) => s.activeCallRoomId);
  const connectionState = useCallStore((s) => s.connectionState);
  const hasUnread = unreadCount > 0;
  const isActiveVoice = channelType === "voice" && activeCallRoomId === roomId && connectionState === "connected";

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(roomId, e.clientX, e.clientY);
  };

  const handleClick = () => {
    onClick();
    // Voice channels also join the call when clicked (if not already in it)
    if (channelType === "voice" && activeCallRoomId !== roomId) {
      useCallStore.getState().joinCall(roomId);
    }
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-left transition-colors ${
        isSelected
          ? "bg-bg-active text-text-primary"
          : hasUnread
            ? "text-text-primary hover:bg-bg-hover"
            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      {channelType === "voice" ? <VoiceChannelIcon active={isActiveVoice} /> : <TextChannelIcon />}
      <span className={`flex-1 truncate text-sm ${hasUnread && !isSelected ? "font-semibold" : ""}`}>
        {name}
      </span>
      {isActiveVoice && (
        <span className="text-[10px] text-green">LIVE</span>
      )}
      {hasUnread && !isActiveVoice && (
        <span className="min-w-[18px] rounded-full bg-red px-1.5 py-0.5 text-center text-xs font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
