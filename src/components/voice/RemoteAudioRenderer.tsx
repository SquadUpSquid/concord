import { useEffect, useMemo, useRef } from "react";
import { Track, type RemoteAudioTrack, type RemoteTrackPublication } from "livekit-client";
import { getActiveLkRoom } from "@/lib/livekit";
import { useCallStore } from "@/stores/callStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface AudioTrackRef {
  key: string;
  participantIdentity: string;
  feedId: string;
  source: Track.Source;
  publication: RemoteTrackPublication;
  track: RemoteAudioTrack;
}

function HiddenAudioTrack({
  trackRef,
  muted,
  volume,
  sinkId,
}: {
  trackRef: AudioTrackRef;
  muted: boolean;
  volume: number;
  sinkId: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    try {
      trackRef.track.attach(el);
    } catch (err) {
      console.warn("Failed to attach LiveKit audio track:", err);
      return;
    }
    el.volume = Math.max(0, Math.min(1, volume));
    void el.play().catch(() => {});

    if (sinkId && "setSinkId" in el) {
      (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
        .setSinkId(sinkId)
        .catch((err) => console.warn("Failed to set audio output device:", err));
    }

    return () => {
      if (audioRef.current) {
        try {
          trackRef.track.detach(audioRef.current);
        } catch {
          // best effort
        }
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, [trackRef, sinkId, volume]);

  return <audio ref={audioRef} autoPlay playsInline muted={muted} />;
}

export function RemoteAudioRenderer() {
  const isDeafened = useCallStore((s) => s.isDeafened);
  const participants = useCallStore((s) => s.participants);
  const connectionState = useCallStore((s) => s.connectionState);
  const screenshareAudioPrefs = useCallStore((s) => s.screenshareAudioPrefs);
  const audioOutputDeviceId = useSettingsStore((s) => s.audioOutputDeviceId);

  // Recompute whenever call participants/state changes.
  const trackRefs = useMemo(() => {
    if (connectionState !== "connected") return [] as AudioTrackRef[];
    const room = getActiveLkRoom();
    if (!room) return [] as AudioTrackRef[];

    const refs: AudioTrackRef[] = [];
    const validIdentities = new Set(
      Array.from(participants.keys())
        .filter((k) => k.startsWith("lk:"))
        .map((k) => k.slice(3)),
    );

    for (const [, rp] of room.remoteParticipants) {
      if (!validIdentities.has(rp.identity)) continue;

      for (const pub of rp.trackPublications.values()) {
        if (pub.kind !== Track.Kind.Audio) continue;
        const track = pub.track;
        if (!track || track.kind !== Track.Kind.Audio) continue;
        if (pub.source !== Track.Source.Microphone && pub.source !== Track.Source.ScreenShareAudio) continue;

        const feedId = pub.source === Track.Source.ScreenShareAudio ? `screenshare:lk:${rp.identity}` : `lk:${rp.identity}`;

        refs.push({
          key: `${rp.identity}:${String(pub.source)}:${pub.trackSid ?? "audio"}`,
          participantIdentity: rp.identity,
          feedId,
          source: pub.source,
          publication: pub,
          track: track as RemoteAudioTrack,
        });
      }
    }

    return refs;
  }, [participants, connectionState]);

  if (trackRefs.length === 0) return null;

  return (
    <div className="hidden" aria-hidden="true">
      {trackRefs.map((ref) => (
        (() => {
          const isScreenshareAudio = ref.source === Track.Source.ScreenShareAudio;
          const prefs = isScreenshareAudio ? screenshareAudioPrefs[ref.feedId] : undefined;
          const muted = isDeafened || (isScreenshareAudio ? (prefs?.muted ?? false) : false);
          const volume = isScreenshareAudio ? ((prefs?.volume ?? 100) / 100) : 1;
          return (
        <HiddenAudioTrack
          key={ref.key}
          trackRef={ref}
          muted={muted}
          volume={volume}
          sinkId={audioOutputDeviceId}
        />
          );
        })()
      ))}
    </div>
  );
}
