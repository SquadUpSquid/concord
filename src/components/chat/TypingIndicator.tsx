import { useTypingStore } from "@/stores/typingStore";

interface TypingIndicatorProps {
  roomId: string;
}

const EMPTY_TYPING: string[] = [];

export function TypingIndicator({ roomId }: TypingIndicatorProps) {
  const typing = useTypingStore((s) => s.typingByRoom.get(roomId) ?? EMPTY_TYPING);

  if (typing.length === 0) return null;

  let text: string;
  if (typing.length === 1) {
    text = `${typing[0]} is typing...`;
  } else if (typing.length === 2) {
    text = `${typing[0]} and ${typing[1]} are typing...`;
  } else {
    text = `${typing[0]} and ${typing.length - 1} others are typing...`;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-text-muted">
      <div className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
      </div>
      <span>{text}</span>
    </div>
  );
}
