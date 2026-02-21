import { useMemo, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { useAuthStore } from "@/stores/authStore";
import { useRoomStore } from "@/stores/roomStore";
import { getMatrixClient } from "@/lib/matrix";
import { useEffect } from "react";

type UpdateCheckResult = {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
};

export function DiagnosticsSection() {
  const [appVersion, setAppVersion] = useState("Unknown");
  const [updateDiag, setUpdateDiag] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const auth = useAuthStore((s) => ({
    userId: s.userId,
    homeserverUrl: s.homeserverUrl,
    isLoggedIn: s.isLoggedIn,
  }));
  const roomState = useRoomStore((s) => ({
    syncState: s.syncState,
    selectedRoomId: s.selectedRoomId,
    selectedSpaceId: s.selectedSpaceId,
    roomCount: s.rooms.size,
  }));

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => setAppVersion("Unknown"));
  }, []);

  const snapshot = useMemo(
    () => ({
      timestamp: new Date().toISOString(),
      appVersion,
      platform: navigator.userAgent,
      auth,
      roomState,
      matrixClientReady: Boolean(getMatrixClient()),
      updaterDiagnostics: updateDiag || null,
    }),
    [appVersion, auth, roomState, updateDiag]
  );

  const runUpdateDiagnostics = async () => {
    setChecking(true);
    try {
      const result = await invoke<UpdateCheckResult>("check_for_updates");
      setUpdateDiag(
        result.available
          ? `Update available: current=${result.currentVersion}, latest=${result.latestVersion ?? "unknown"}`
          : `No update available: current=${result.currentVersion}`
      );
    } catch (err) {
      setUpdateDiag(`Update check failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setChecking(false);
    }
  };

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      setCopyStatus("Diagnostics copied.");
      setTimeout(() => setCopyStatus(null), 1500);
    } catch {
      setCopyStatus("Copy failed.");
    }
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">Diagnostics</h2>
      <p className="mb-6 text-sm text-text-muted">
        Runtime details for debugging sync, update, and environment issues.
      </p>

      <div className="rounded-lg bg-bg-secondary p-5">
        <div className="space-y-1 text-sm text-text-secondary">
          <p><span className="text-text-muted">App Version:</span> {appVersion}</p>
          <p><span className="text-text-muted">Sync State:</span> {roomState.syncState}</p>
          <p><span className="text-text-muted">Rooms Loaded:</span> {roomState.roomCount}</p>
          <p><span className="text-text-muted">Selected Space:</span> {roomState.selectedSpaceId ?? "none"}</p>
          <p><span className="text-text-muted">Selected Room:</span> {roomState.selectedRoomId ?? "none"}</p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={runUpdateDiagnostics}
            disabled={checking}
            className="rounded-sm border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            {checking ? "Checking updates..." : "Run Update Diagnostics"}
          </button>
          <button
            onClick={copyDiagnostics}
            className="rounded-sm border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
          >
            Copy Diagnostics JSON
          </button>
        </div>
        {updateDiag && <p className="mt-3 text-xs text-text-muted">{updateDiag}</p>}
        {copyStatus && <p className="mt-2 text-xs text-green">{copyStatus}</p>}
      </div>
    </div>
  );
}

