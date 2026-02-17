import { useEffect, useRef } from "react";
import { getFeedStream } from "@/stores/callStore";

interface ScreenshareFeedViewProps {
  feedId: string;
  displayName: string;
}

export function ScreenshareFeedView({ feedId, displayName }: ScreenshareFeedViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = getFeedStream(feedId);

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
      <div className="border-t border-bg-tertiary px-3 py-2 text-sm text-text-secondary">
        {displayName} is sharing
      </div>
    </div>
  );
}
