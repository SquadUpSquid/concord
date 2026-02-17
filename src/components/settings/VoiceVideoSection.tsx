import { useState, useEffect, useCallback } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { getMatrixClient } from "@/lib/matrix";

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

const DEFAULT_LABEL = "Default device";

async function requestDeviceLabels(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    // Permission denied or no devices — labels may be empty
  }
}

export function VoiceVideoSection() {
  const audioInputDeviceId = useSettingsStore((s) => s.audioInputDeviceId);
  const audioOutputDeviceId = useSettingsStore((s) => s.audioOutputDeviceId);
  const videoInputDeviceId = useSettingsStore((s) => s.videoInputDeviceId);
  const setAudioInputDeviceId = useSettingsStore((s) => s.setAudioInputDeviceId);
  const setAudioOutputDeviceId = useSettingsStore((s) => s.setAudioOutputDeviceId);
  const setVideoInputDeviceId = useSettingsStore((s) => s.setVideoInputDeviceId);

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await requestDeviceLabels();
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        list
          .filter(
            (d) =>
              d.kind === "audioinput" ||
              d.kind === "audiooutput" ||
              d.kind === "videoinput"
          )
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `${d.kind} (${d.deviceId.slice(0, 8)}…)`,
            kind: d.kind as DeviceInfo["kind"],
          }))
      );
    } catch (err) {
      console.error("Failed to list devices:", err);
      setError("Could not access microphone or camera. Check browser permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const audioInputs = devices.filter((d) => d.kind === "audioinput");
  const audioOutputs = devices.filter((d) => d.kind === "audiooutput");
  const videoInputs = devices.filter((d) => d.kind === "videoinput");

  const applyInputDevicesToSdk = useCallback(
    (audioId: string | null, videoId: string | null) => {
      const client = getMatrixClient();
      const handler = client?.getMediaHandler?.();
      if (!handler) return;
      (handler as { setMediaInputs(a?: string, v?: string): Promise<unknown> })
        .setMediaInputs(audioId ?? undefined, videoId ?? undefined)
        .catch((err) => console.warn("Failed to apply media devices:", err));
    },
    []
  );

  const handleAudioInputChange = (deviceId: string) => {
    const value = deviceId === "" ? null : deviceId;
    setAudioInputDeviceId(value);
    applyInputDevicesToSdk(value, videoInputDeviceId);
  };

  const handleAudioOutputChange = (deviceId: string) => {
    setAudioOutputDeviceId(deviceId === "" ? null : deviceId);
  };

  const handleVideoInputChange = (deviceId: string) => {
    const value = deviceId === "" ? null : deviceId;
    setVideoInputDeviceId(value);
    applyInputDevicesToSdk(audioInputDeviceId, value);
  };

  if (loading) {
    return (
      <div>
        <h2 className="mb-2 text-xl font-bold text-text-primary">Voice & Video</h2>
        <p className="mb-6 text-sm text-text-muted">
          Choose your microphone, speaker, and camera for voice and video calls.
        </p>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-muted/30 border-t-text-muted" />
          Loading devices…
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">Voice & Video</h2>
      <p className="mb-6 text-sm text-text-muted">
        Choose your microphone, speaker, and camera for voice and video calls.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      <div className="space-y-6 rounded-lg bg-bg-secondary p-5">
        <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
          Input & Output
        </h3>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
            Microphone
          </label>
          <select
            value={audioInputDeviceId ?? ""}
            onChange={(e) => handleAudioInputChange(e.target.value)}
            className="w-full rounded-sm border border-bg-active bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">{DEFAULT_LABEL}</option>
            {audioInputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
            Speaker / Output
          </label>
          <select
            value={audioOutputDeviceId ?? ""}
            onChange={(e) => handleAudioOutputChange(e.target.value)}
            className="w-full rounded-sm border border-bg-active bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">{DEFAULT_LABEL}</option>
            {audioOutputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-text-muted">
            Used for hearing other participants. Applied when you join a call.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
            Camera
          </label>
          <select
            value={videoInputDeviceId ?? ""}
            onChange={(e) => handleVideoInputChange(e.target.value)}
            className="w-full rounded-sm border border-bg-active bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">{DEFAULT_LABEL}</option>
            {videoInputs.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-text-muted">
            Used when you turn your camera on in a voice or video call. Change takes effect when you turn the camera on (or toggle it off and on).
          </p>
        </div>

        <button
          type="button"
          onClick={loadDevices}
          className="text-xs text-text-muted underline hover:text-text-primary"
        >
          Refresh device list
        </button>
      </div>
    </div>
  );
}
