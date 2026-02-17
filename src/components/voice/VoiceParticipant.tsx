import { useEffect, useRef } from "react";
import { Avatar } from "@/components/common/Avatar";
import { CallParticipant, getFeedStream } from "@/stores/callStore";
import { useCallStore } from "@/stores/callStore";

interface VoiceParticipantProps {
  participant: CallParticipant;
  isLocal?: boolean;
}

export function VoiceParticipant({ participant, isLocal = false }: VoiceParticipantProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const isDeafened = useCallStore((s) => s.isDeafened);

  const stream = participant.feedId ? getFeedStream(participant.feedId) : null;
  const hasVideo = stream?.getVideoTracks().some((t) => t.enabled) && !participant.isVideoMuted;

  // Attach video stream when video is active
  useEffect(() => {
    if (videoRef.current && stream && hasVideo) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, hasVideo]);

  // Attach audio stream for remote participants (local audio would cause echo)
  useEffect(() => {
    if (!isLocal && audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream, isLocal]);

  const isMuted = participant.isAudioMuted;
  const isSpeaking = participant.isSpeaking && !isMuted;

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-lg bg-bg-secondary p-4 transition-all ${
        isSpeaking ? "ring-2 ring-green" : "ring-1 ring-bg-tertiary"
      }`}
    >
      {/* Audio playback for remote participants */}
      {!isLocal && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          muted={isDeafened}
        />
      )}

      {/* Video feed */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || isDeafened}
          className="h-full w-full rounded-md object-cover"
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Avatar
            name={participant.displayName}
            url={participant.avatarUrl}
            size={80}
          />
        </div>
      )}

      {/* Name + status bar */}
      <div className="mt-3 flex items-center gap-1.5">
        <span className="max-w-[120px] truncate text-sm font-medium text-text-primary">
          {participant.displayName}
          {isLocal && <span className="ml-1 text-text-muted">(You)</span>}
        </span>

        {/* Muted icon */}
        {isMuted && (
          <svg className="h-4 w-4 flex-shrink-0 text-red" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
          </svg>
        )}
      </div>
    </div>
  );
}
