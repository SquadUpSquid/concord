import { useUiStore } from "@/stores/uiStore";
import { useCallStore, CallParticipant } from "@/stores/callStore";
import { useAuthStore } from "@/stores/authStore";
import { useChannelPrefsStore } from "@/stores/channelPrefsStore";
import { Avatar } from "@/components/common/Avatar";
import type { ChannelType } from "@/stores/roomStore";

const EMPTY_PARTICIPANTS: CallParticipant[] = [];

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

function VoiceParticipantEntry({ participant }: { participant: CallParticipant }) {
  const myUserId = useAuthStore((s) => s.userId);
  const isMe = participant.userId === myUserId;

  return (
    <div className="flex items-center gap-2 rounded py-0.5 pl-8 pr-2 text-text-secondary hover:bg-bg-hover/50">
      <Avatar
        name={participant.displayName}
        url={participant.avatarUrl}
        size={20}
      />
      <span className="flex-1 truncate text-xs">
        {participant.displayName}
        {isMe && <span className="ml-1 text-text-muted">(You)</span>}
      </span>
      {participant.isAudioMuted && (
        <svg className="h-3 w-3 flex-shrink-0 text-red" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
        </svg>
      )}
    </div>
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
  const isMuted = useChannelPrefsStore((s) => s.prefs[roomId]?.isMuted ?? false);
  const hasUnread = !isMuted && unreadCount > 0;
  const isActiveVoice = channelType === "voice" && activeCallRoomId === roomId && connectionState === "connected";

  // Get participants for this voice channel (from state events or active call).
  // IMPORTANT: selectors must return stable references — a bare `[]` creates a
  // new array on every render, which Zustand treats as "changed" (compared by ===),
  // causing an infinite re-render loop.
  const roomParticipantsMap = useCallStore((s) => s.participantsByRoom);
  const participantsMap = useCallStore((s) => s.participants);
  const roomParticipants =
    channelType === "voice" ? roomParticipantsMap.get(roomId) ?? EMPTY_PARTICIPANTS : EMPTY_PARTICIPANTS;
  const activeCallParticipants =
    channelType === "voice" && activeCallRoomId === roomId && connectionState === "connected"
      ? Array.from(participantsMap.values())
      : EMPTY_PARTICIPANTS;

  // Use active call participants if we're in this call, otherwise use state-event-based list
  const voiceParticipants: CallParticipant[] =
    isActiveVoice && activeCallParticipants.length > 0
      ? activeCallParticipants
      : roomParticipants;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openContextMenu(roomId, e.clientX, e.clientY);
  };

  const handleClick = () => {
    onClick();
  };

  const isVoice = channelType === "voice";

  return (
    <div className={isVoice ? "mb-0.5" : ""}>
      <button
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`flex w-full items-center gap-1.5 rounded px-2 ${isVoice ? "py-1.5" : "py-1"} text-left transition-colors ${
          isSelected
            ? "bg-bg-active text-text-primary"
            : hasUnread
              ? "text-text-primary hover:bg-bg-hover"
              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        }`}
      >
        {isVoice ? <VoiceChannelIcon active={isActiveVoice} /> : <TextChannelIcon />}
        <span className={`flex-1 truncate text-sm ${hasUnread && !isSelected ? "font-semibold" : ""}`}>
          {name}
        </span>
        {isMuted && (
          <svg className="h-3.5 w-3.5 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13.73 21a2 2 0 01-3.46 0M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
        {isActiveVoice && (
          <span className="text-[10px] text-green">LIVE</span>
        )}
        {hasUnread && !isActiveVoice && (
          <span className="min-w-[18px] rounded-full bg-red px-1.5 py-0.5 text-center text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Voice channel participants */}
      {isVoice && voiceParticipants.length > 0 && (
        <div className="pb-0.5 pt-0.5">
          {voiceParticipants.map((p) => (
            <VoiceParticipantEntry
              key={p.userId}
              participant={p}
            />
          ))}
        </div>
      )}
    </div>
  );
}
