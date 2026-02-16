import { useCallStore } from "@/stores/callStore";
import { useRoomStore } from "@/stores/roomStore";
import { useAuthStore } from "@/stores/authStore";
import { VoiceParticipant } from "./VoiceParticipant";
import { VoiceControlBar } from "./VoiceControlBar";

interface VoiceChannelViewProps {
  roomId: string;
}

export function VoiceChannelView({ roomId }: VoiceChannelViewProps) {
  const room = useRoomStore((s) => s.rooms.get(roomId));
  const connectionState = useCallStore((s) => s.connectionState);
  const activeCallRoomId = useCallStore((s) => s.activeCallRoomId);
  const participants = useCallStore((s) => s.participants);
  const joinCall = useCallStore((s) => s.joinCall);
  const userId = useAuthStore((s) => s.userId);

  const isInThisCall = activeCallRoomId === roomId && connectionState === "connected";
  const isConnecting = activeCallRoomId === roomId && connectionState === "connecting";
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
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        {!isInThisCall && !isConnecting ? (
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
              <p className="mt-1 text-sm text-text-muted">
                No one is in this voice channel yet.
              </p>
            </div>
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
          /* In call - show participants grid */
          <div className={`grid w-full max-w-3xl gap-4 ${gridCols}`}>
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
        )}
      </div>

      {/* Control bar - only show when in call */}
      {isInThisCall && <VoiceControlBar />}
    </div>
  );
}
