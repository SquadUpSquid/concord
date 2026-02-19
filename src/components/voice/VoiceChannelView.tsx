import { useState, useEffect } from "react";
import { useCallStore, CallParticipant } from "@/stores/callStore";
import { useRoomStore } from "@/stores/roomStore";
import { useAuthStore } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { Avatar } from "@/components/common/Avatar";
import { VoiceParticipant } from "./VoiceParticipant";
import { VoiceControlBar } from "./VoiceControlBar";
import { VoiceChatPanel } from "./VoiceChatPanel";
import { ScreenshareFeedView } from "./ScreenshareFeedView";
import { getMatrixClient } from "@/lib/matrix";
import { loadRoomMessages } from "@/lib/matrixEventHandlers";

const EMPTY_PARTICIPANTS: CallParticipant[] = [];

interface VoiceChannelViewProps {
  roomId: string;
}

export function VoiceChannelView({ roomId }: VoiceChannelViewProps) {
  const room = useRoomStore((s) => s.rooms.get(roomId));
  const connectionState = useCallStore((s) => s.connectionState);
  const activeCallRoomId = useCallStore((s) => s.activeCallRoomId);
  const participants = useCallStore((s) => s.participants);
  const error = useCallStore((s) => s.error);
  const joinCall = useCallStore((s) => s.joinCall);
  const clearError = useCallStore((s) => s.clearError);
  const userId = useAuthStore((s) => s.userId);
  const roomParticipantsMap = useCallStore((s) => s.participantsByRoom);
  const roomParticipants = roomParticipantsMap.get(roomId) ?? EMPTY_PARTICIPANTS;
  const screenshareFeeds = useCallStore((s) => s.screenshareFeeds);
  const openModal = useUiStore((s) => s.openModal);
  const toggleMembers = useUiStore((s) => s.toggleMemberSidebar);
  const showMembers = useUiStore((s) => s.showMemberSidebar);

  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (showChat) {
      const client = getMatrixClient();
      if (client) loadRoomMessages(client, roomId);
    }
  }, [showChat, roomId]);

  const isInThisCall = activeCallRoomId === roomId && connectionState === "connected";
  const isConnecting = activeCallRoomId === roomId && connectionState === "connecting";
  const hasError = activeCallRoomId === roomId && !!error;
  const participantList = Array.from(participants.values());

  // Separate local user from remote participants
  const localParticipant = participantList.find((p) => p.userId === userId);
  const remoteParticipants = participantList.filter((p) => p.userId !== userId);

  // Grid column count based on participant count
  const total = participantList.length;
  const gridCols =
    total <= 1 ? "grid-cols-1" :
    total <= 4 ? "grid-cols-2" :
    total <= 9 ? "grid-cols-3" :
    "grid-cols-4";

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex h-12 items-center border-b border-bg-tertiary px-4 shadow-sm">
        <svg className="mr-2 h-5 w-5 text-text-muted" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 004 7.46V22h2v-2.54a8.95 8.95 0 006 0V22h2v-2.54A9 9 0 0021 12v-2h-2z" />
        </svg>
        <h3 className="font-semibold text-text-primary">{room?.name ?? "Voice Channel"}</h3>
        {isInThisCall && (
          <span className="ml-3 text-xs text-green">
            Voice Connected
          </span>
        )}
        {room?.topic && (
          <>
            <div className="mx-3 h-6 w-px bg-bg-active" />
            <p className="flex-1 truncate text-sm text-text-muted">{room.topic}</p>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {/* Toggle chat */}
          <button
            onClick={() => setShowChat((v) => !v)}
            className={`rounded p-1.5 transition-colors ${
              showChat ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
            title="Toggle Chat"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            </svg>
          </button>
          {/* Channel settings */}
          <button
            onClick={() => openModal("roomSettings")}
            className="rounded p-1.5 text-text-muted hover:text-text-primary"
            title="Channel settings"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
          {/* Toggle member list */}
          <button
            onClick={toggleMembers}
            className={`rounded p-1.5 transition-colors ${
              showMembers ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
            title="Toggle member list"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {hasError ? (
          /* Error state */
          <div className="flex flex-col items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red/10">
              <svg className="h-10 w-10 text-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>
            <div className="max-w-sm text-center">
              <h2 className="text-lg font-semibold text-text-primary">
                Failed to connect
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                {error}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  clearError();
                }}
                className="rounded-md bg-bg-active px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  clearError();
                  joinCall(roomId);
                }}
                className="rounded-md bg-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green/80"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : !isInThisCall && !isConnecting ? (
          /* Not in call - show join prompt */
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-bg-secondary">
              <svg className="h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 004 7.46V22h2v-2.54a8.95 8.95 0 006 0V22h2v-2.54A9 9 0 0021 12v-2h-2z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-text-primary">
                {room?.name ?? "Voice Channel"}
              </h2>
              {roomParticipants.length > 0 ? (
                <p className="mt-1 text-sm text-text-muted">
                  {roomParticipants.length} {roomParticipants.length === 1 ? "person" : "people"} currently in voice
                </p>
              ) : (
                <p className="mt-1 text-sm text-text-muted">
                  No one is in this voice channel yet.
                </p>
              )}
            </div>

            {/* Show who's already in the channel */}
            {roomParticipants.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3">
                {roomParticipants.map((p) => (
                  <div key={p.userId} className="flex flex-col items-center gap-1">
                    <Avatar
                      name={p.displayName}
                      url={p.avatarUrl}
                      mxcUrl={p.mxcAvatarUrl}
                      size={48}
                    />
                    <span className="max-w-[80px] truncate text-xs text-text-secondary">
                      {p.displayName}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => joinCall(roomId)}
              className="rounded-md bg-green px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green/80"
            >
              Join Voice
            </button>
          </div>
        ) : isConnecting ? (
          /* Connecting state */
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-bg-active border-t-accent" />
            <p className="text-sm text-text-muted">Connecting to voice...</p>
          </div>
        ) : (
          /* In call - show screenshares + participants grid */
          <div className="flex w-full max-w-3xl flex-1 flex-col gap-4">
            {screenshareFeeds.length > 0 && (
              <div className="grid w-full gap-4 sm:grid-cols-2">
                {screenshareFeeds.map((f) => (
                  <ScreenshareFeedView
                    key={f.feedId}
                    feedId={f.feedId}
                    displayName={f.displayName}
                  />
                ))}
              </div>
            )}
            <div className={`grid w-full gap-4 ${gridCols}`}>
              {localParticipant && (
                <VoiceParticipant
                  participant={localParticipant}
                  isLocal
                />
              )}
              {remoteParticipants.map((p) => (
                <VoiceParticipant
                  key={p.feedId ?? p.userId}
                  participant={p}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control bar - only show when in call */}
        {isInThisCall && <VoiceControlBar />}
      </div>
      {showChat && <VoiceChatPanel roomId={roomId} onClose={() => setShowChat(false)} />}
    </div>
  );
}
