import { useState, useRef, useCallback } from "react";
import { getMatrixClient } from "@/lib/matrix";

interface MessageInputProps {
  roomId: string;
}

export function MessageInput({ roomId }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const sendTyping = useCallback(
    (typing: boolean) => {
      const client = getMatrixClient();
      if (!client || isTyping.current === typing) return;
      isTyping.current = typing;
      client.sendTyping(roomId, typing, typing ? 30000 : 0).catch(() => {});
    },
    [roomId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    if (e.target.value.length > 0) {
      sendTyping(true);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => sendTyping(false), 5000);
    } else {
      sendTyping(false);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    }
  };

  const handleSend = async () => {
    const body = message.trim();
    if (!body) return;

    const client = getMatrixClient();
    if (!client) return;

    setMessage("");
    sendTyping(false);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);

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
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          className="flex-1 bg-transparent py-3 text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
    </div>
  );
}
