import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";

type UpdateCheckResult = {
  available: boolean;
  currentVersion: string;
  latestVersion: string | null;
};

export function AboutSection() {
  const [version, setVersion] = useState<string>("Unknown");
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getVersion()
      .then((v) => {
        if (mounted) setVersion(v);
      })
      .catch(() => {
        if (mounted) setVersion("Unknown");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    setError(null);
    setStatus(null);

    try {
      const result = await invoke<UpdateCheckResult>("check_for_updates");
      setUpdateAvailable(result.available);
      setLatestVersion(result.latestVersion ?? null);

      if (result.available && result.latestVersion) {
        setStatus(`Update available: v${result.latestVersion}`);
      } else {
        setStatus(`You're up to date on v${result.currentVersion}.`);
      }
    } catch (err) {
      console.error("Update check failed:", err);
      setError("Failed to check for updates.");
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    setInstalling(true);
    setError(null);
    setStatus("Downloading and installing update...");

    try {
      await invoke("install_update");
      setStatus("Update installed. Concord will restart now.");
    } catch (err) {
      console.error("Update install failed:", err);
      setError("Update install failed.");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">About</h2>
      <p className="mb-6 text-sm text-text-muted">
        Concord is a modern desktop Matrix client focused on a familiar chat UX, voice/video support, and secure messaging.
      </p>

      <div className="mb-6 rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-3 text-sm font-bold uppercase text-text-secondary">Version</h3>
        <div className="space-y-2 text-sm">
          <p className="text-text-primary">
            <span className="text-text-muted">App:</span> v{version}
          </p>
          <p className="text-text-primary">
            <span className="text-text-muted">Platform:</span> Tauri v2 (Rust + React)
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-3 text-sm font-bold uppercase text-text-secondary">Updates</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCheckForUpdates}
            disabled={checking || installing}
            className="rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {checking ? "Checking..." : "Check for Updates"}
          </button>
          {updateAvailable && (
            <button
              onClick={handleInstallUpdate}
              disabled={installing || checking}
              className="rounded-sm border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
            >
              {installing ? "Installing..." : "Install Update"}
            </button>
          )}
        </div>
        {latestVersion && (
          <p className="mt-3 text-sm text-text-muted">Latest available version: v{latestVersion}</p>
        )}
        {status && <p className="mt-3 text-sm text-green">{status}</p>}
        {error && <p className="mt-3 text-sm text-red">{error}</p>}
      </div>

      <div className="rounded-lg border border-bg-active bg-bg-secondary/50 p-4">
        <p className="text-sm font-medium text-text-primary">General Information</p>
        <p className="mt-1 text-xs text-text-muted">
          Concord connects to Matrix homeservers, supports spaces/channels/direct messages, and includes optional end-to-end encryption features provided by Matrix.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Project repository: https://github.com/SquadUpSquid/concord
        </p>
      </div>
    </div>
  );
}
