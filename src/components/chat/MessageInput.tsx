import { useState } from "react";
import { getMatrixClient } from "@/lib/matrix";

interface MessageInputProps {
  roomId: string;
}

export function MessageInput({ roomId }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    const body = message.trim();
    if (!body) return;

    const client = getMatrixClient();
    if (!client) return;

    setMessage("");

    try {
      await client.sendTextMessage(roomId, body);
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessage(body);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="flex items-center rounded-lg bg-bg-input px-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
    </div>
  );
}
