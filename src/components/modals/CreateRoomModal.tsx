import { useState, useRef, useEffect } from "react";
import { Modal } from "@/components/common/Modal";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { useAuthStore } from "@/stores/authStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { getMatrixClient } from "@/lib/matrix";
import { Visibility, Preset } from "matrix-js-sdk";
import type { ChannelType } from "@/stores/roomStore";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { ThemedSelect } from "@/components/common/ThemedSelect";

export function CreateRoomModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const selectRoom = useRoomStore((s) => s.selectRoom);
  const homeserverUrl = useAuthStore((s) => s.homeserverUrl);

  const categories = useCategoryStore((s) =>
    selectedSpaceId ? s.getCategories(selectedSpaceId) : []
  );
  const saveCategories = useCategoryStore((s) => s.saveCategories);

  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [channelType, setChannelType] = useState<ChannelType>("text");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [encrypted, setEncrypted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const client = getMatrixClient();
    if (!client) return;

    setLoading(true);
    setError(null);

    try {
      const initialState: { type: string; state_key: string; content: Record<string, unknown> }[] = [];
      if (encrypted) {
        initialState.push({
          type: "m.room.encryption",
          state_key: "",
          content: { algorithm: "m.megolm.v1.aes-sha2" },
        });
      }

      // Use Element's standard room type for voice/video rooms
      // io.element.video is recognized by Element and other Matrix clients
      const creationContent: Record<string, unknown> = {};
      if (channelType === "voice") {
        creationContent.type = "io.element.video";
      }

      const { room_id } = await client.createRoom({
        name: name.trim(),
        topic: topic.trim() || undefined,
        visibility: isPublic ? Visibility.Public : Visibility.Private,
        preset: isPublic ? Preset.PublicChat : Preset.PrivateChat,
        initial_state: initialState,
        creation_content: Object.keys(creationContent).length > 0 ? creationContent : undefined,
      });

      // If a space is selected, add room as child of that space
      if (selectedSpaceId && homeserverUrl) {
        const homeserver = new URL(homeserverUrl).hostname;
        await client.sendStateEvent(
          selectedSpaceId,
          "m.space.child" as any,
          { via: [homeserver] },
          room_id,
        );

        // Add to selected category if one was chosen
        if (selectedCategoryId && categories.length > 0) {
          const updated = categories.map((c) =>
            c.id === selectedCategoryId
              ? { ...c, channelIds: [...c.channelIds, room_id] }
              : c
          );
          await saveCategories(selectedSpaceId, updated);
        }
      }

      closeModal();
      selectRoom(room_id);
    } catch (err) {
      console.error("Failed to create room:", err);
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create Channel" onClose={closeModal}>
      <div className="flex flex-col gap-4">
        {/* Channel type selector */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Channel Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setChannelType("text")}
              className={`flex flex-1 items-center gap-2 rounded-sm border p-3 text-left transition-colors ${
                channelType === "text"
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-bg-active bg-bg-secondary text-text-secondary hover:border-text-muted"
              }`}
            >
              <span className="text-xl">#</span>
              <div>
                <p className="text-sm font-medium">Text</p>
                <p className="text-xs text-text-muted">Send messages and files</p>
              </div>
            </button>
            <button
              onClick={() => setChannelType("voice")}
              className={`flex flex-1 items-center gap-2 rounded-sm border p-3 text-left transition-colors ${
                channelType === "voice"
                  ? "border-accent bg-accent/10 text-text-primary"
                  : "border-bg-active bg-bg-secondary text-text-secondary hover:border-text-muted"
              }`}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2H3v2a9 9 0 004 7.46V22h2v-2.54a8.95 8.95 0 006 0V22h2v-2.54A9 9 0 0021 12v-2h-2z" />
              </svg>
              <div>
                <p className="text-sm font-medium">Voice</p>
                <p className="text-xs text-text-muted">Voice and video chat</p>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Channel Name
          </label>
          <div className="relative flex items-center gap-1">
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder={channelType === "text" ? "new-channel" : "General Voice"}
              className="w-full rounded-sm bg-bg-input p-2.5 pr-10 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
            <div className="absolute right-1" ref={emojiRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="rounded p-1 text-text-muted hover:text-text-primary"
                title="Add emoji"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                </svg>
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 z-50 mb-2">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setName((prev) => prev + emoji);
                      setShowEmojiPicker(false);
                      nameInputRef.current?.focus();
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {channelType === "text" && (
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
              Topic (optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        {/* Category selector — only show when in a space with categories */}
        {selectedSpaceId && categories.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
              Section
            </label>
            <ThemedSelect
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              placeholder="None (uncategorized)"
              options={[
                { value: "", label: "None (uncategorized)" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Private Channel</p>
            <p className="text-xs text-text-muted">Only invited members can join</p>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              !isPublic ? "bg-accent" : "bg-bg-active"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                !isPublic ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">Enable Encryption</p>
            <p className="text-xs text-text-muted">Cannot be disabled once enabled</p>
          </div>
          <button
            onClick={() => setEncrypted(!encrypted)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              encrypted ? "bg-accent" : "bg-bg-active"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                encrypted ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={closeModal}
            className="rounded-sm px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Creating..." : `Create ${channelType === "text" ? "Text" : "Voice"} Channel`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
