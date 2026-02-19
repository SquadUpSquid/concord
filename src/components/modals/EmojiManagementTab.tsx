import { useState, useRef, useEffect } from "react";
import { getMatrixClient } from "@/lib/matrix";
import { useCustomEmojiStore, type CustomEmoji } from "@/stores/customEmojiStore";
import { useMatrixImage } from "@/utils/useMatrixImage";

interface EmojiManagementTabProps {
  roomId: string;
}

function EmojiThumbnail({ emoji }: { emoji: CustomEmoji }) {
  const { src } = useMatrixImage(emoji.url, 48, 48);
  return (
    <img
      src={src ?? undefined}
      alt={`:${emoji.shortcode}:`}
      className="h-10 w-10 rounded object-contain"
      draggable={false}
    />
  );
}

export function EmojiManagementTab({ roomId }: EmojiManagementTabProps) {
  const loadRoomEmojis = useCustomEmojiStore((s) => s.loadRoomEmojis);
  const roomPacks = useCustomEmojiStore((s) => s.roomPacks);
  const [uploading, setUploading] = useState(false);
  const [shortcode, setShortcode] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const client = getMatrixClient();

  useEffect(() => {
    loadRoomEmojis(roomId);
  }, [roomId, loadRoomEmojis]);

  useEffect(() => {
    if (!client || !roomId) return;
    const room = client.getRoom(roomId);
    if (!room) return;
    const powerLevels = room.currentState
      .getStateEvents("m.room.power_levels", "")
      ?.getContent();
    const userId = client.getUserId() ?? "";
    const userPower = powerLevels?.users?.[userId] ?? powerLevels?.users_default ?? 0;
    const stateDefault = powerLevels?.state_default ?? 50;
    setCanManage(userPower >= stateDefault);
  }, [client, roomId]);

  const packs = roomPacks.get(roomId);
  const defaultPack = packs?.get("") ?? { emojis: [] };
  const allEmojis = defaultPack.emojis;

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
    if (!shortcode) {
      const name = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      setShortcode(name);
    }
  };

  const handleUpload = async () => {
    if (!client || !selectedFile || !shortcode.trim()) return;
    const sc = shortcode.trim().replace(/[^a-zA-Z0-9_]/g, "_");
    if (!sc) {
      setError("Shortcode must contain letters, numbers, or underscores");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await client.uploadContent(selectedFile, { type: selectedFile.type });
      const mxcUrl = typeof response === "string" ? response : response.content_uri;

      const currentEvent = client.getRoom(roomId)?.currentState.getStateEvents(
        "im.ponies.room_emotes" as any, "",
      );
      const currentContent = currentEvent?.getContent() ?? {};
      const images = { ...(currentContent.images ?? {}) };
      images[sc] = { url: mxcUrl, body: sc, usage: ["emoticon"] };

      await client.sendStateEvent(
        roomId,
        "im.ponies.room_emotes" as any,
        { ...currentContent, images, pack: currentContent.pack ?? { display_name: "Custom Emojis", usage: ["emoticon"] } },
        "",
      );

      loadRoomEmojis(roomId);
      setSuccess(`Added :${sc}:`);
      setSelectedFile(null);
      setShortcode("");
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to upload emoji:", err);
      setError(err instanceof Error ? err.message : "Failed to upload emoji");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (sc: string) => {
    if (!client) return;
    setError(null);
    try {
      const currentEvent = client.getRoom(roomId)?.currentState.getStateEvents(
        "im.ponies.room_emotes" as any, "",
      );
      const currentContent = currentEvent?.getContent() ?? {};
      const images = { ...(currentContent.images ?? {}) };
      delete images[sc];

      await client.sendStateEvent(
        roomId,
        "im.ponies.room_emotes" as any,
        { ...currentContent, images },
        "",
      );

      loadRoomEmojis(roomId);
    } catch (err) {
      console.error("Failed to delete emoji:", err);
      setError(err instanceof Error ? err.message : "Failed to delete emoji");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">
        Custom emojis are available to everyone in this room. They appear in the emoji picker and can be used with <code>:shortcode:</code> syntax.
      </p>

      {/* Upload form */}
      {canManage && (
        <div className="rounded-lg border border-bg-active p-3">
          <p className="mb-3 text-xs font-bold uppercase text-text-secondary">Add Emoji</p>
          <div className="flex items-end gap-3">
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-bg-active bg-bg-primary transition-colors hover:border-accent"
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="h-12 w-12 rounded object-contain" />
                ) : (
                  <svg className="h-6 w-6 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-text-muted">Shortcode</label>
              <input
                type="text"
                value={shortcode}
                onChange={(e) => setShortcode(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                placeholder="emoji_name"
                className="w-full rounded bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:ring-2 focus:ring-accent"
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !shortcode.trim()}
              className="rounded bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Existing emojis */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-text-secondary">
          Emojis ({allEmojis.length})
        </p>
        {allEmojis.length === 0 ? (
          <p className="text-sm text-text-muted">No custom emojis yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {allEmojis.map((emoji) => (
              <div
                key={emoji.shortcode}
                className="flex items-center gap-3 rounded-lg bg-bg-primary p-2"
              >
                <EmojiThumbnail emoji={emoji} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    :{emoji.shortcode}:
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDelete(emoji.shortcode)}
                    className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-red"
                    title="Delete emoji"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}
      {success && <p className="text-sm text-green">{success}</p>}
    </div>
  );
}
