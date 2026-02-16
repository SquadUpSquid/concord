import { useEffect } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { getMatrixClient } from "@/lib/matrix";
import { loadRoomMessages } from "@/lib/matrixEventHandlers";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { TypingIndicator } from "./TypingIndicator";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { VoiceChannelView } from "@/components/voice/VoiceChannelView";

export function ChatView() {
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const rooms = useRoomStore((s) => s.rooms);

  const room = selectedRoomId ? rooms.get(selectedRoomId) : undefined;
  const isVoiceChannel = room?.channelType === "voice";

  useEffect(() => {
    const client = getMatrixClient();
    if (client && selectedRoomId && !isVoiceChannel) {
      try {
        loadRoomMessages(client, selectedRoomId);
      } catch (err) {
        console.error("Failed to load room messages:", err);
      }
    }
  }, [selectedRoomId, isVoiceChannel]);

  if (!selectedRoomId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-bg-primary">
        <p className="text-lg text-text-muted">Select a channel to start chatting</p>
      </div>
    );
  }

  // Voice channels get their own dedicated view
  if (isVoiceChannel) {
    return (
      <ErrorBoundary>
        <VoiceChannelView roomId={selectedRoomId} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex flex-1 flex-col bg-bg-primary">
        <ChatHeader
          name={room?.name ?? "Unknown"}
          topic={room?.topic ?? null}
        />
        <MessageList roomId={selectedRoomId} />
        <TypingIndicator roomId={selectedRoomId} />
        <MessageInput roomId={selectedRoomId} />
      </div>
    </ErrorBoundary>
  );
}
