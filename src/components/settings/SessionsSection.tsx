import { useState, useEffect, useCallback } from "react";
import { getMatrixClient } from "@/lib/matrix";
import { requestOwnUserVerification, checkCurrentDeviceVerified } from "@/lib/verification";
import { useVerificationStore } from "@/stores/verificationStore";
import { decodeRecoveryKey } from "matrix-js-sdk/lib/crypto-api/recovery-key";
import { ImportRoomKeyStage } from "matrix-js-sdk/lib/crypto-api";
import { useRoomStore } from "@/stores/roomStore";
import { loadRoomMessages } from "@/lib/matrixEventHandlers";

interface DeviceInfo {
  deviceId: string;
  displayName: string | null;
  lastSeenIp: string | null;
  lastSeenTs: number | null;
  isCurrent: boolean;
}

export function SessionsSection() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [removePassword, setRemovePassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [restoreRecoveryKey, setRestoreRecoveryKey] = useState("");
  const [restorePassphrase, setRestorePassphrase] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<string | null>(null);
  const [restoreResult, setRestoreResult] = useState<string | null>(null);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const deviceVerified = useVerificationStore((s) => s.deviceVerified);
  const activeRequest = useVerificationStore((s) => s.activeRequest);
  const incomingRequests = useVerificationStore((s) => s.incomingRequests);
  const setActiveRequest = useVerificationStore((s) => s.setActiveRequest);

  const fetchDevices = useCallback(async () => {
    const client = getMatrixClient();
    if (!client) return;

    try {
      const response = await client.getDevices();
      const currentDeviceId = client.getDeviceId();
      const list: DeviceInfo[] = (response.devices ?? []).map(
        (d: { device_id: string; display_name?: string; last_seen_ip?: string; last_seen_ts?: number }) => ({
          deviceId: d.device_id,
          displayName: d.display_name ?? null,
          lastSeenIp: d.last_seen_ip ?? null,
          lastSeenTs: d.last_seen_ts ?? null,
          isCurrent: d.device_id === currentDeviceId,
        })
      );
      list.sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        return (b.lastSeenTs ?? 0) - (a.lastSeenTs ?? 0);
      });
      setDevices(list);
    } catch (err) {
      console.error("Failed to fetch devices:", err);
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    const client = getMatrixClient();
    if (client) {
      checkCurrentDeviceVerified(client).catch(() => {});
    }
  }, []);

  const handleStartVerification = async () => {
    const client = getMatrixClient();
    if (!client) return;
    const pending = activeRequest ?? incomingRequests[0] ?? null;
    if (pending) {
      setActiveRequest(pending);
      return;
    }
    setVerifying(true);
    try {
      await requestOwnUserVerification(client);
    } catch {
      setError("Failed to start verification.");
    } finally {
      setVerifying(false);
    }
  };

  const handleRestoreFromRecoveryKey = async () => {
    const client = getMatrixClient();
    if (!client) return;
    const crypto = client.getCrypto();
    if (!crypto) return;
    if (!restoreRecoveryKey.trim()) {
      setError("Enter a recovery key.");
      return;
    }

    setRestoring(true);
    setError(null);
    setRestoreResult(null);
    setRestoreProgress("Preparing key backup restore...");
    try {
      const key = decodeRecoveryKey(restoreRecoveryKey.trim());
      const backupInfo = await crypto.getKeyBackupInfo();
      const version = backupInfo?.version;
      if (!version) {
        throw new Error("No key backup found on this account.");
      }

      await crypto.storeSessionBackupPrivateKey(key, version);
      await crypto.checkKeyBackupAndEnable();
      const result = await crypto.restoreKeyBackup({
        progressCallback: (progress) => {
          if (progress.stage === ImportRoomKeyStage.Fetch) {
            setRestoreProgress("Fetching backup keys from server...");
            return;
          }
          setRestoreProgress(`Restoring keys... ${progress.successes + progress.failures}/${progress.total}`);
        },
      });
      setRestoreResult(`Recovered ${result.imported} of ${result.total} keys from backup.`);
      if (selectedRoomId) {
        loadRoomMessages(client, selectedRoomId);
      }
      setRestoreRecoveryKey("");
      setRestoreProgress(null);
    } catch (err) {
      console.error("Restore from recovery key failed:", err);
      setError(err instanceof Error ? err.message : "Failed to restore from recovery key.");
      setRestoreProgress(null);
    } finally {
      setRestoring(false);
    }
  };

  const handleRestoreFromPassphrase = async () => {
    const client = getMatrixClient();
    if (!client) return;
    const crypto = client.getCrypto();
    if (!crypto) return;
    if (!restorePassphrase.trim()) {
      setError("Enter a backup passphrase.");
      return;
    }

    setRestoring(true);
    setError(null);
    setRestoreResult(null);
    setRestoreProgress("Preparing key backup restore...");
    try {
      const result = await crypto.restoreKeyBackupWithPassphrase(restorePassphrase.trim(), {
        progressCallback: (progress) => {
          if (progress.stage === ImportRoomKeyStage.Fetch) {
            setRestoreProgress("Fetching backup keys from server...");
            return;
          }
          setRestoreProgress(`Restoring keys... ${progress.successes + progress.failures}/${progress.total}`);
        },
      });
      setRestoreResult(`Recovered ${result.imported} of ${result.total} keys from backup.`);
      if (selectedRoomId) {
        loadRoomMessages(client, selectedRoomId);
      }
      setRestorePassphrase("");
      setRestoreProgress(null);
    } catch (err) {
      console.error("Restore from passphrase failed:", err);
      setError(err instanceof Error ? err.message : "Failed to restore from passphrase.");
      setRestoreProgress(null);
    } finally {
      setRestoring(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    setError(null);
    setRemoveTargetId(deviceId);
    setRemovePassword("");
  };

  const handleConfirmRemoveDevice = async (deviceId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    if (!removePassword.trim()) {
      setError("Enter your account password to remove this session.");
      return;
    }

    setRemovingId(deviceId);
    try {
      const userId = client.getUserId();
      await client.deleteDevice(
        deviceId,
        {
          type: "m.login.password",
          identifier: userId ? { type: "m.id.user", user: userId } : undefined,
          password: removePassword,
        } as never
      );
      setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
      setRemoveTargetId(null);
      setRemovePassword("");
    } catch (err: unknown) {
      const matrixErr = err as { data?: { flows?: unknown[]; errcode?: string; error?: string } };
      if (matrixErr?.data?.flows) {
        setError("This homeserver requires a different re-authentication flow to remove sessions.");
      } else if (matrixErr?.data?.errcode === "M_FORBIDDEN") {
        setError("Incorrect password. Please try again.");
      } else {
        setError(matrixErr?.data?.error ?? "Failed to remove device");
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handleRename = async (deviceId: string) => {
    const client = getMatrixClient();
    if (!client || !newName.trim()) return;

    try {
      await client.setDeviceDetails(deviceId, { display_name: newName.trim() });
      setDevices((prev) =>
        prev.map((d) => (d.deviceId === deviceId ? { ...d, displayName: newName.trim() } : d))
      );
      setRenamingId(null);
      setNewName("");
    } catch {
      setError("Failed to rename device");
    }
  };

  const formatDate = (ts: number | null): string => {
    if (!ts) return "Unknown";
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">Sessions</h2>
      <p className="mb-6 text-sm text-text-muted">
        Manage your active sessions. These are the devices currently logged into your Matrix account.
      </p>

      <div className="mb-4 rounded-lg border border-bg-active bg-bg-secondary p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Session verification</p>
            <p className="text-xs text-text-muted">
              {deviceVerified === true
                ? "This device is verified."
                : "This device is not verified. Verify it with another trusted device."}
            </p>
          </div>
          {deviceVerified !== true && (
            <button
              onClick={handleStartVerification}
              disabled={verifying}
              className="rounded-sm bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {verifying ? "Starting..." : (activeRequest || incomingRequests.length > 0) ? "Continue verification" : "Verify this device"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-bg-active bg-bg-secondary p-4">
        <div className="mb-3">
          <p className="text-sm font-medium text-text-primary">Encrypted history recovery</p>
          <p className="text-xs text-text-muted">
            Recover old encrypted messages on this device.
          </p>
        </div>

        <div className="mb-3 rounded border border-bg-active bg-bg-tertiary p-3">
          <p className="text-xs font-semibold uppercase text-text-secondary">1. Key share from verified device</p>
          <p className="mt-1 text-xs text-text-muted">
            Verify this device with one of your already logged-in trusted devices to receive missing room keys.
          </p>
          <button
            onClick={handleStartVerification}
            disabled={verifying}
            className="mt-2 rounded-sm bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {verifying ? "Starting..." : (activeRequest || incomingRequests.length > 0) ? "Continue verification" : "Start verification"}
          </button>
        </div>

        <div className="rounded border border-bg-active bg-bg-tertiary p-3">
          <p className="text-xs font-semibold uppercase text-text-secondary">2. Restore from encrypted key backup</p>
          <p className="mt-1 text-xs text-text-muted">
            If you enabled backup before, restore keys using your recovery key or backup passphrase.
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase text-text-secondary">Recovery Key</label>
            <input
              type="text"
              value={restoreRecoveryKey}
              onChange={(e) => setRestoreRecoveryKey(e.target.value)}
              placeholder="EsTc... (recovery key)"
              className="rounded-sm bg-bg-input px-2 py-1.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => void handleRestoreFromRecoveryKey()}
              disabled={restoring}
              className="w-fit rounded-sm border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
            >
              Restore with Recovery Key
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase text-text-secondary">Backup Passphrase</label>
            <input
              type="password"
              value={restorePassphrase}
              onChange={(e) => setRestorePassphrase(e.target.value)}
              placeholder="Backup passphrase"
              className="rounded-sm bg-bg-input px-2 py-1.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
            />
            <button
              onClick={() => void handleRestoreFromPassphrase()}
              disabled={restoring}
              className="w-fit rounded-sm border border-bg-active px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-50"
            >
              Restore with Passphrase
            </button>
          </div>

          {restoreProgress && <p className="mt-3 text-xs text-text-muted">{restoreProgress}</p>}
          {restoreResult && <p className="mt-2 text-xs text-green">{restoreResult}</p>}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red/30 bg-red/10 p-3">
          <p className="text-sm text-red">{error}</p>
          <button onClick={() => setError(null)} className="mt-1 text-xs text-text-muted hover:text-text-primary">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((device) => (
            <div
              key={device.deviceId}
              className={`rounded-lg bg-bg-secondary p-4 ${
                device.isCurrent ? "border border-accent/30" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                    {renamingId === device.deviceId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="rounded-sm bg-bg-input px-2 py-1 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent"
                          placeholder="Device name"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(device.deviceId);
                            if (e.key === "Escape") { setRenamingId(null); setNewName(""); }
                          }}
                        />
                        <button
                          onClick={() => handleRename(device.deviceId)}
                          className="text-xs text-accent hover:text-accent-hover"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setRenamingId(null); setNewName(""); }}
                          className="text-xs text-text-muted hover:text-text-primary"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-text-primary">
                        {device.displayName || device.deviceId}
                        {device.isCurrent && (
                          <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                            Current
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
                    <span title="Device ID">{device.deviceId}</span>
                    {device.lastSeenIp && <span>IP: {device.lastSeenIp}</span>}
                    <span>Last active: {formatDate(device.lastSeenTs)}</span>
                  </div>
                </div>

                <div className="ml-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRenamingId(device.deviceId);
                      setNewName(device.displayName ?? "");
                    }}
                    className="rounded-sm p-1 text-text-muted hover:text-text-primary"
                    title="Rename"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                  </button>
                  {!device.isCurrent && (
                    <button
                      onClick={() => handleRemoveDevice(device.deviceId)}
                      disabled={removingId === device.deviceId}
                      className="rounded-sm p-1 text-text-muted hover:text-red disabled:opacity-50"
                      title="Remove session"
                    >
                      {removingId === device.deviceId ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red/30 border-t-red" />
                      ) : (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {removeTargetId === device.deviceId && !device.isCurrent && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded border border-bg-active bg-bg-tertiary p-2">
                  <input
                    type="password"
                    value={removePassword}
                    onChange={(e) => setRemovePassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleConfirmRemoveDevice(device.deviceId);
                      if (e.key === "Escape") {
                        setRemoveTargetId(null);
                        setRemovePassword("");
                      }
                    }}
                    placeholder="Enter password to confirm"
                    className="min-w-[220px] flex-1 rounded-sm bg-bg-input px-2 py-1.5 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
                    autoFocus
                  />
                  <button
                    onClick={() => void handleConfirmRemoveDevice(device.deviceId)}
                    disabled={removingId === device.deviceId}
                    className="rounded-sm bg-red px-3 py-1.5 text-xs font-medium text-white hover:bg-red/85 disabled:opacity-50"
                  >
                    {removingId === device.deviceId ? "Removing..." : "Confirm Remove"}
                  </button>
                  <button
                    onClick={() => {
                      setRemoveTargetId(null);
                      setRemovePassword("");
                    }}
                    className="rounded-sm border border-bg-active px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
