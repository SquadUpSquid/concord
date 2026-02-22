import { useEffect, useMemo, useRef } from "react";
import { Track, type RemoteAudioTrack, type RemoteTrackPublication } from "livekit-client";
import { getActiveLkRoom } from "@/lib/livekit";
import { useCallStore } from "@/stores/callStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface AudioTrackRef {
  key: string;
  participantIdentity: string;
  publication: RemoteTrackPublication;
  track: RemoteAudioTrack;
}

function HiddenAudioTrack({ trackRef, muted, sinkId }: { trackRef: AudioTrackRef; muted: boolean; sinkId: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    // Build a fresh one-track stream for this audio track to avoid mixed-track corruption.
    const sourceStream = trackRef.track.mediaStream;
    if (!sourceStream) {
      el.srcObject = null;
      return;
    }
    const stream = new MediaStream();
    for (const t of sourceStream.getAudioTracks()) {
      if (!stream.getAudioTracks().some((existing) => existing.id === t.id)) {
        stream.addTrack(t);
      }
    }

    el.srcObject = stream;
    void el.play().catch(() => {});

    if (sinkId && "setSinkId" in el) {
      (el as HTMLAudioElement & { setSinkId(id: string): Promise<void> })
        .setSinkId(sinkId)
        .catch((err) => console.warn("Failed to set audio output device:", err));
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
    };
  }, [trackRef, sinkId]);

  return <audio ref={audioRef} autoPlay playsInline muted={muted} />;
}

export function RemoteAudioRenderer() {
  const isDeafened = useCallStore((s) => s.isDeafened);
  const participants = useCallStore((s) => s.participants);
  const connectionState = useCallStore((s) => s.connectionState);
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
        if (pub.source === Track.Source.ScreenShare) continue;
        const track = pub.track;
        if (!track || track.kind !== Track.Kind.Audio) continue;

        refs.push({
          key: `${rp.identity}:${pub.trackSid ?? "audio"}`,
          participantIdentity: rp.identity,
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
        <HiddenAudioTrack
          key={ref.key}
          trackRef={ref}
          muted={isDeafened}
          sinkId={audioOutputDeviceId}
        />
      ))}
    </div>
  );
}
