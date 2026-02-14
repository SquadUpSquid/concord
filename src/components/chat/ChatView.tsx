import { useEffect } from "react";
import { useRoomStore } from "@/stores/roomStore";
import { getMatrixClient } from "@/lib/matrix";
import { loadRoomMessages } from "@/lib/matrixEventHandlers";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

export function ChatView() {
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const rooms = useRoomStore((s) => s.rooms);

  useEffect(() => {
    const client = getMatrixClient();
    if (client && selectedRoomId) {
      loadRoomMessages(client, selectedRoomId);
    }
  }, [selectedRoomId]);

  if (!selectedRoomId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-bg-primary">
        <p className="text-lg text-text-muted">Select a channel to start chatting</p>
      </div>
    );
  }

  const room = rooms.get(selectedRoomId);

  return (
    <div className="flex flex-1 flex-col bg-bg-primary">
      <ChatHeader
        name={room?.name ?? "Unknown"}
        topic={room?.topic ?? null}
      />
      <MessageList roomId={selectedRoomId} />
      <MessageInput roomId={selectedRoomId} />
    </div>
  );
}
