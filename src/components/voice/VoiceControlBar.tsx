import { useCallStore } from "@/stores/callStore";

export function VoiceControlBar() {
  const isMicMuted = useCallStore((s) => s.isMicMuted);
  const isVideoMuted = useCallStore((s) => s.isVideoMuted);
  const isDeafened = useCallStore((s) => s.isDeafened);
  const isScreenSharing = useCallStore((s) => s.isScreenSharing);
  const toggleMic = useCallStore((s) => s.toggleMic);
  const toggleVideo = useCallStore((s) => s.toggleVideo);
  const toggleDeafen = useCallStore((s) => s.toggleDeafen);
  const toggleScreenShare = useCallStore((s) => s.toggleScreenShare);
  const leaveCall = useCallStore((s) => s.leaveCall);

  return (
    <div className="flex items-center justify-center gap-2 border-t border-bg-tertiary bg-bg-secondary px-6 py-4">
      {/* Microphone */}
      <ControlButton
        active={!isMicMuted}
        danger={isMicMuted}
        onClick={toggleMic}
        title={isMicMuted ? "Unmute" : "Mute"}
      >
        {isMicMuted ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        )}
      </ControlButton>

      {/* Deafen */}
      <ControlButton
        active={!isDeafened}
        danger={isDeafened}
        onClick={toggleDeafen}
        title={isDeafened ? "Undeafen" : "Deafen"}
      >
        {isDeafened ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.34 2.93L2.93 4.34 7.29 8.7 7 9H3v6h4l5 5v-6.59l4.18 4.18c-.65.49-1.38.88-2.18 1.11v2.06c1.34-.3 2.57-.97 3.6-1.88l2.05 2.05 1.41-1.41L4.34 2.93zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zm-7-8l-1.88 1.88L12 7.76V4zm4.5 8A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-3.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        )}
      </ControlButton>

      {/* Video */}
      <ControlButton
        active={!isVideoMuted}
        danger={isVideoMuted}
        onClick={toggleVideo}
        title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
      >
        {isVideoMuted ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
        )}
      </ControlButton>

      {/* Screen Share */}
      <ControlButton
        active={isScreenSharing}
        onClick={toggleScreenShare}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
        </svg>
      </ControlButton>

      {/* Separator */}
      <div className="mx-2 h-8 w-px bg-bg-active" />

      {/* Disconnect */}
      <button
        onClick={leaveCall}
        className="flex items-center gap-2 rounded-full bg-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red/80"
        title="Disconnect"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
        </svg>
        Disconnect
      </button>
    </div>
  );
}

interface ControlButtonProps {
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function ControlButton({ active, danger, onClick, title, children }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
        danger
          ? "bg-bg-active text-red hover:bg-bg-hover"
          : active
            ? "bg-bg-active text-text-primary hover:bg-bg-hover"
            : "bg-bg-active text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}
