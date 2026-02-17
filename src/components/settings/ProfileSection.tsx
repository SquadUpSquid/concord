import { useState, useRef } from "react";
import { Avatar } from "@/components/common/Avatar";
import { useAuthStore } from "@/stores/authStore";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";

export function ProfileSection() {
  const userId = useAuthStore((s) => s.userId);
  const setProfile = useAuthStore((s) => s.setProfile);

  const client = getMatrixClient();
  const user = client?.getUser(userId ?? "");
  const homeserverUrl = client?.getHomeserverUrl() ?? "";

  const [displayName, setDisplayName] = useState(user?.displayName ?? userId ?? "");
  const [avatarMxc, setAvatarMxc] = useState(user?.avatarUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatarHttpUrl = mxcToHttp(avatarMxc, homeserverUrl);
  const originalName = user?.displayName ?? userId ?? "";
  const originalAvatar = user?.avatarUrl ?? null;
  const hasChanges = displayName.trim() !== originalName || avatarMxc !== originalAvatar;

  const handleAvatarUpload = async (file: File) => {
    if (!client) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10 MB"); return; }

    setUploadingAvatar(true);
    setError(null);
    try {
      const response = await client.uploadContent(file, { type: file.type });
      const mxcUrl = typeof response === "string" ? response : response.content_uri;
      setAvatarMxc(mxcUrl);
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      setError("Failed to upload image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!client) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const trimmedName = displayName.trim();
      if (trimmedName !== originalName) await client.setDisplayName(trimmedName);
      if (avatarMxc !== originalAvatar) await client.setAvatarUrl(avatarMxc ?? "");
      setProfile(trimmedName, avatarMxc ? mxcToHttp(avatarMxc, homeserverUrl) : null);
      setSuccessMsg("Profile updated!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">My Account</h2>
      <p className="mb-6 text-sm text-text-muted">
        Manage your profile information and account details.
      </p>

      {/* Profile card */}
      <div className="overflow-hidden rounded-lg bg-bg-secondary">
        <div className="h-24 bg-accent" />
        <div className="px-6 pb-5">
          <div className="-mt-10 flex items-end gap-4">
            <div className="relative flex-shrink-0">
              <div className="rounded-full border-[5px] border-bg-secondary">
                <Avatar name={displayName || "?"} url={avatarHttpUrl} size={80} />
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <p className="truncate text-lg font-bold leading-tight text-text-primary">
                {displayName || userId}
              </p>
              <p className="truncate text-sm leading-snug text-text-muted">{userId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit profile */}
      <div className="mt-4 rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-text-secondary">
          Profile
        </h3>

        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {uploadingAvatar ? "Uploading..." : "Change Avatar"}
          </button>
          {avatarMxc && (
            <button
              onClick={() => setAvatarMxc(null)}
              disabled={uploadingAvatar}
              className="rounded-sm px-3 py-1.5 text-sm text-text-muted hover:text-red disabled:opacity-50"
            >
              Remove Avatar
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAvatarUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-sm bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
            User ID
          </label>
          <div className="rounded-sm bg-bg-input px-3 py-2 text-sm text-text-muted">
            {userId}
          </div>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-text-secondary">
            Homeserver
          </label>
          <div className="rounded-sm bg-bg-input px-3 py-2 text-sm text-text-muted">
            {homeserverUrl}
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-red">{error}</p>}
        {successMsg && <p className="mb-3 text-sm text-green">{successMsg}</p>}

        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving || !displayName.trim()}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>
    </div>
  );
}
