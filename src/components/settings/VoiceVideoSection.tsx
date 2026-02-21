import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { getMatrixClient } from "@/lib/matrix";
import { ThemedSelect } from "@/components/common/ThemedSelect";
import { isLivekitActive, switchLkDevice } from "@/lib/livekit";

interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput" | "videoinput";
}

const DEFAULT_LABEL = "Default device";

async function requestDeviceLabels(): Promise<void> {
  // Request audio and video separately so a missing camera doesn't block microphone access
  for (const constraint of [{ audio: true }, { video: true }]) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraint);
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      // Permission denied or no devices for this media kind
    }
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
  const [micLevel, setMicLevel] = useState(0);
  const [testingMic, setTestingMic] = useState(false);
  const testingMicRef = useRef(false);
  const [cameraPreviewOn, setCameraPreviewOn] = useState(false);
  const [cameraPreviewUrl, setCameraPreviewUrl] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setError("Media device APIs are not available. Your system may not support WebRTC.");
        setDevices([]);
        return;
      }

      await requestDeviceLabels();
      const list = await navigator.mediaDevices.enumerateDevices();
      const filtered = list.filter(
        (d) =>
          d.kind === "audioinput" ||
          d.kind === "audiooutput" ||
          d.kind === "videoinput"
      );

      if (filtered.length === 0) {
        setError(
          "No audio or video devices detected. If you're on WSL2, make sure PulseAudio/PipeWire is running. " +
          "You can still join voice channels and hear others."
        );
      }

      setDevices(
        filtered.map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `${d.kind} (${d.deviceId.slice(0, 8)}…)`,
          kind: d.kind as DeviceInfo["kind"],
        }))
      );
    } catch (err) {
      console.error("Failed to list devices:", err);
      setError("Could not access microphone or camera. Check system permissions.");
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

  const audioInputOptions = useMemo(
    () => [{ value: "", label: DEFAULT_LABEL }, ...audioInputs.map((d) => ({ value: d.deviceId, label: d.label }))],
    [audioInputs]
  );
  const audioOutputOptions = useMemo(
    () => [{ value: "", label: DEFAULT_LABEL }, ...audioOutputs.map((d) => ({ value: d.deviceId, label: d.label }))],
    [audioOutputs]
  );
  const videoInputOptions = useMemo(
    () => [{ value: "", label: DEFAULT_LABEL }, ...videoInputs.map((d) => ({ value: d.deviceId, label: d.label }))],
    [videoInputs]
  );

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
    if (isLivekitActive() && value) {
      switchLkDevice("audioinput", value).catch(() => {});
    } else {
      applyInputDevicesToSdk(value, videoInputDeviceId);
    }
  };

  const handleAudioOutputChange = (deviceId: string) => {
    const value = deviceId === "" ? null : deviceId;
    setAudioOutputDeviceId(value);
    if (isLivekitActive() && value) {
      switchLkDevice("audiooutput", value).catch(() => {});
    }
  };

  const handleVideoInputChange = (deviceId: string) => {
    const value = deviceId === "" ? null : deviceId;
    setVideoInputDeviceId(value);
    if (isLivekitActive() && value) {
      switchLkDevice("videoinput", value).catch(() => {});
    } else {
      applyInputDevicesToSdk(audioInputDeviceId, value);
    }
  };

  const stopCameraPreview = useCallback(() => {
    if (cameraPreviewUrl) {
      URL.revokeObjectURL(cameraPreviewUrl);
      setCameraPreviewUrl(null);
    }
    const previewEl = document.getElementById("camera-preview-video") as HTMLVideoElement | null;
    const stream = previewEl?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (previewEl) previewEl.srcObject = null;
    setCameraPreviewOn(false);
  }, [cameraPreviewUrl]);

  const startCameraPreview = useCallback(async () => {
    stopCameraPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoInputDeviceId ? { deviceId: { exact: videoInputDeviceId } } : true,
        audio: false,
      });
      const previewEl = document.getElementById("camera-preview-video") as HTMLVideoElement | null;
      if (previewEl) {
        previewEl.srcObject = stream;
        await previewEl.play().catch(() => {});
      }
      setCameraPreviewOn(true);
    } catch (err) {
      console.error("Camera preview failed:", err);
      setError("Unable to start camera preview. Check camera permission.");
    }
  }, [videoInputDeviceId, stopCameraPreview]);

  const testSpeakerTone = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close().catch(() => {});
      }, 350);
    } catch (err) {
      console.error("Speaker test failed:", err);
    }
  };

  const testMicrophone = async () => {
    if (testingMic) {
      testingMicRef.current = false;
      setTestingMic(false);
      return;
    }
    testingMicRef.current = true;
    setTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioInputDeviceId ? { deviceId: { exact: audioInputDeviceId } } : true,
        video: false,
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!testingMicRef.current) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128;
          sum += normalized * normalized;
        }
        setMicLevel(Math.min(1, Math.sqrt(sum / data.length) * 5));
        requestAnimationFrame(tick);
      };
      tick();

      setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
        ctx.close().catch(() => {});
        testingMicRef.current = false;
        setTestingMic(false);
      }, 5000);
    } catch (err) {
      console.error("Microphone test failed:", err);
      testingMicRef.current = false;
      setTestingMic(false);
      setError("Unable to access microphone for test.");
    }
  };

  useEffect(() => {
    return () => stopCameraPreview();
  }, [stopCameraPreview]);

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
          <ThemedSelect
            value={audioInputDeviceId ?? ""}
            options={audioInputOptions}
            onChange={handleAudioInputChange}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
            Speaker / Output
          </label>
          <ThemedSelect
            value={audioOutputDeviceId ?? ""}
            options={audioOutputOptions}
            onChange={handleAudioOutputChange}
          />
          <p className="mt-1 text-[11px] text-text-muted">
            Used for hearing other participants. Applied when you join a call.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
            Camera
          </label>
          <ThemedSelect
            value={videoInputDeviceId ?? ""}
            options={videoInputOptions}
            onChange={handleVideoInputChange}
          />
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

        <div className="space-y-3 border-t border-bg-active pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Quality Checks</h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={testMicrophone}
              className="rounded border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              {testingMic ? "Stop Mic Test" : "Test Microphone"}
            </button>
            <button
              type="button"
              onClick={testSpeakerTone}
              className="rounded border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              Play Test Tone
            </button>
            <button
              type="button"
              onClick={() => (cameraPreviewOn ? stopCameraPreview() : startCameraPreview())}
              className="rounded border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              {cameraPreviewOn ? "Stop Camera Preview" : "Start Camera Preview"}
            </button>
          </div>
          <div className="h-2 w-full rounded bg-bg-active">
            <div
              className="h-2 rounded bg-green transition-all"
              style={{ width: `${Math.round(micLevel * 100)}%` }}
            />
          </div>
          <video
            id="camera-preview-video"
            className={`w-full rounded bg-black ${cameraPreviewOn ? "block" : "hidden"}`}
            autoPlay
            muted
            playsInline
          />
        </div>
      </div>
    </div>
  );
}
