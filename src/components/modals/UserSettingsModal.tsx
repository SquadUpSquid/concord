import { useState, useRef } from "react";
import { Modal } from "@/components/common/Modal";
import { Avatar } from "@/components/common/Avatar";
import { useUiStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";

export function UserSettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
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

  const avatarHttpUrl = mxcToHttp(avatarMxc, homeserverUrl, 160, 160);
  const originalName = user?.displayName ?? userId ?? "";
  const originalAvatar = user?.avatarUrl ?? null;
  const hasChanges = displayName.trim() !== originalName || avatarMxc !== originalAvatar;

  const handleAvatarUpload = async (file: File) => {
    if (!client) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }

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

  const handleRemoveAvatar = () => {
    setAvatarMxc(null);
  };

  const handleSave = async () => {
    if (!client) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const trimmedName = displayName.trim();
      if (trimmedName !== originalName) {
        await client.setDisplayName(trimmedName);
      }
      if (avatarMxc !== originalAvatar) {
        await client.setAvatarUrl(avatarMxc ?? "");
      }
      setProfile(trimmedName, avatarMxc ? mxcToHttp(avatarMxc, homeserverUrl) : null);
      setSuccessMsg("Profile updated!");
      setTimeout(() => closeModal(), 800);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="User Settings" onClose={closeModal}>
      <div className="flex flex-col gap-5">
        {/* Avatar section */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar name={displayName || "?"} url={avatarHttpUrl} size={80} />
            {uploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {uploadingAvatar ? "Uploading..." : "Change Avatar"}
            </button>
            {avatarMxc && (
              <button
                onClick={handleRemoveAvatar}
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
        </div>

        {/* Display Name */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* User ID (read-only) */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            User ID
          </label>
          <div className="flex items-center rounded-sm bg-bg-input p-2.5 text-sm text-text-muted">
            {userId}
          </div>
        </div>

        {/* Homeserver (read-only) */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Homeserver
          </label>
          <div className="flex items-center rounded-sm bg-bg-input p-2.5 text-sm text-text-muted">
            {homeserverUrl}
          </div>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}
        {successMsg && <p className="text-sm text-green">{successMsg}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={closeModal}
            className="rounded-sm px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges || !displayName.trim()}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
