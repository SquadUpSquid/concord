import { useEffect, useRef } from "react";
import { getFeedStream } from "@/stores/callStore";
import { useCallStore } from "@/stores/callStore";

interface ScreenshareFeedViewProps {
  feedId: string;
  displayName: string;
}

export function ScreenshareFeedView({ feedId, displayName }: ScreenshareFeedViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = getFeedStream(feedId);
  const prefs = useCallStore((s) => s.screenshareAudioPrefs[feedId] ?? { muted: false, volume: 100 });
  const setMuted = useCallStore((s) => s.setScreenshareAudioMuted);
  const setVolume = useCallStore((s) => s.setScreenshareAudioVolume);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (stream) {
      video.srcObject = stream;
    } else {
      video.srcObject = null;
    }
    return () => {
      video.srcObject = null;
    };
  }, [stream, feedId]);

  if (!stream) return null;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-bg-tertiary bg-bg-secondary">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="aspect-video w-full object-contain"
      />
      <div className="border-t border-bg-tertiary px-3 py-2">
        <div className="mb-2 text-sm text-text-secondary">
          {displayName} is sharing
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted(feedId, !prefs.muted)}
            className={`rounded px-2 py-1 text-xs ${prefs.muted ? "bg-bg-active text-text-primary" : "bg-green/20 text-green"}`}
            title={prefs.muted ? "Unmute shared audio" : "Mute shared audio"}
          >
            {prefs.muted ? "Unmute Audio" : "Mute Audio"}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={prefs.volume}
            onChange={(e) => setVolume(feedId, Number(e.target.value))}
            className="w-32 accent-accent"
            aria-label="Shared audio volume"
          />
          <span className="w-10 text-right text-xs text-text-muted">{prefs.volume}%</span>
        </div>
      </div>
    </div>
  );
}
