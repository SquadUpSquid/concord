import { useState, useEffect, useRef, useMemo } from "react";
import { Modal } from "@/components/common/Modal";
import { Avatar } from "@/components/common/Avatar";
import { ThemedSelect } from "@/components/common/ThemedSelect";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { useAuthStore } from "@/stores/authStore";
import { useMemberStore, type Member } from "@/stores/memberStore";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import {
  getRoleForPowerLevel,
  getAssignableRoles,
  getPowerLevelForRoleName,
  POWER_LEVEL_OWNER,
} from "@/utils/roles";
import { syncRoomMembers } from "@/lib/matrixEventHandlers";

type Tab = "overview" | "members";

export function SpaceSettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const selectedSpaceId = useRoomStore((s) => s.selectedSpaceId);
  const rooms = useRoomStore((s) => s.rooms);
  const userId = useAuthStore((s) => s.userId);

  const space = selectedSpaceId ? rooms.get(selectedSpaceId) : null;
  const [tab, setTab] = useState<Tab>("overview");

  if (!space) return null;

  return (
    <Modal title={`${space.name} — Space Settings`} onClose={closeModal} wide>
      <div className="flex flex-col gap-0">
        {/* Tabs */}
        <div className="-mx-4 -mt-1 mb-4 flex border-b border-bg-active px-4">
          {(["overview", "members"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <OverviewTab space={space} spaceId={selectedSpaceId!} userId={userId} closeModal={closeModal} />
        )}
        {tab === "members" && (
          <MembersTab spaceId={selectedSpaceId!} userId={userId} />
        )}

        {/* Danger zone */}
        <div className="mt-4 border-t border-bg-active pt-4">
          <LeaveSpaceButton spaceId={selectedSpaceId!} closeModal={closeModal} />
        </div>
      </div>
    </Modal>
  );
}

/* ──────── Leave Space Button ──────── */
function LeaveSpaceButton({ spaceId, closeModal }: { spaceId: string; closeModal: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleLeave = async () => {
    const client = getMatrixClient();
    if (!client) return;
    setLeaving(true);
    try {
      await client.leave(spaceId);
      useRoomStore.getState().removeRoom(spaceId);
      useRoomStore.getState().selectSpace(null);
      closeModal();
    } catch (err) {
      console.error("Failed to leave space:", err);
      setLeaving(false);
    }
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-sm px-4 py-2 text-sm font-medium text-red hover:bg-red/10"
      >
        Leave Space
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-muted">Are you sure?</span>
      <button
        onClick={handleLeave}
        disabled={leaving}
        className="rounded-sm bg-red px-4 py-2 text-sm font-medium text-white hover:bg-red/80 disabled:opacity-50"
      >
        {leaving ? "Leaving..." : "Yes, Leave"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="rounded-sm px-3 py-2 text-sm text-text-muted hover:text-text-primary"
      >
        Cancel
      </button>
    </div>
  );
}

/* ──────── Overview Tab ──────── */
function OverviewTab({
  space,
  spaceId,
  userId,
  closeModal,
}: {
  space: NonNullable<ReturnType<typeof useRoomStore.getState>["rooms"] extends Map<string, infer V> ? V : never>;
  spaceId: string;
  userId: string | null;
  closeModal: () => void;
}) {
  const [name, setName] = useState(space.name);
  const [topic, setTopic] = useState(space.topic ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMxc, setAvatarMxc] = useState<string | null>(null);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showNameEmojiPicker, setShowNameEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameEmojiRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const client = getMatrixClient();
  const homeserverUrl = client?.getHomeserverUrl() ?? "";
  const updateRoom = useRoomStore((s) => s.updateRoom);

  useEffect(() => {
    if (!client || !spaceId || !userId) return;
    const matrixRoom = client.getRoom(spaceId);
    if (!matrixRoom) return;
    const powerLevels = matrixRoom.currentState
      .getStateEvents("m.room.power_levels", "")
      ?.getContent();
    const userPower = powerLevels?.users?.[userId] ?? powerLevels?.users_default ?? 0;
    const requiredPower = powerLevels?.events?.["m.room.name"] ?? powerLevels?.state_default ?? 50;
    setCanEdit(userPower >= requiredPower);
  }, [spaceId, userId, client]);

  useEffect(() => {
    if (!showNameEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (nameEmojiRef.current && !nameEmojiRef.current.contains(e.target as Node)) {
        setShowNameEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showNameEmojiPicker]);

  const displayAvatarUrl = avatarMxc
    ? mxcToHttp(avatarMxc, homeserverUrl)
    : space.avatarUrl;

  const handleAvatarUpload = async (file: File) => {
    if (!client || !canEdit) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file"); return; }
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

  const hasChanges =
    name.trim() !== space.name ||
    topic.trim() !== (space.topic ?? "") ||
    avatarMxc !== null;

  const handleSave = async () => {
    if (!client || !spaceId) return;
    setSaving(true);
    setError(null);
    try {
      if (name.trim() !== space.name) {
        await client.setRoomName(spaceId, name.trim());
        updateRoom(spaceId, { name: name.trim() });
      }
      if (topic.trim() !== (space.topic ?? "")) {
        await client.setRoomTopic(spaceId, topic.trim());
        updateRoom(spaceId, { topic: topic.trim() });
      }
      if (avatarMxc) {
        await client.sendStateEvent(spaceId, "m.room.avatar" as any, { url: avatarMxc }, "");
        updateRoom(spaceId, { avatarUrl: mxcToHttp(avatarMxc, homeserverUrl), mxcAvatarUrl: avatarMxc });
      }
      setSuccessMsg("Settings saved!");
      setTimeout(() => closeModal(), 600);
    } catch (err) {
      console.error("Failed to update space:", err);
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!client || !spaceId || !inviteUserId.trim()) return;
    setInviting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await client.invite(spaceId, inviteUserId.trim());
      setSuccessMsg(`Invited ${inviteUserId.trim()}`);
      setInviteUserId("");
    } catch (err) {
      console.error("Failed to invite:", err);
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  // Count child channels
  const rooms = useRoomStore((s) => s.rooms);
  const childCount = Array.from(rooms.values()).filter(
    (r) => r.parentSpaceId === spaceId && !r.isSpace
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Space avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={space.name} url={displayAvatarUrl} mxcUrl={avatarMxc ?? space.mxcAvatarUrl} size={64} />
          {uploadingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="rounded-sm bg-bg-active px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-hover disabled:opacity-50"
            >
              Change Icon
            </button>
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
        )}
      </div>

      {/* Name */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
          Space Name
        </label>
        <div className="relative flex items-center">
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="w-full rounded-sm bg-bg-input p-2.5 pr-10 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          />
          {canEdit && (
            <div className="absolute right-1" ref={nameEmojiRef}>
              <button
                type="button"
                onClick={() => setShowNameEmojiPicker(!showNameEmojiPicker)}
                className="rounded p-1 text-text-muted hover:text-text-primary"
                title="Add emoji"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                </svg>
              </button>
              {showNameEmojiPicker && (
                <div className="absolute bottom-full right-0 z-50 mb-2">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setName((prev) => prev + emoji);
                      setShowNameEmojiPicker(false);
                      nameInputRef.current?.focus();
                    }}
                    onClose={() => setShowNameEmojiPicker(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Topic / Description */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
          Description
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={!canEdit}
          placeholder="What is this space about?"
          rows={2}
          className="w-full resize-none rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />
      </div>

      {canEdit && hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="self-end rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      )}

      {/* Info */}
      <div className="rounded-lg bg-bg-primary/50 p-3">
        <p className="text-xs text-text-muted">
          {childCount} {childCount === 1 ? "channel" : "channels"} in this space
        </p>
      </div>

      {/* Invite */}
      <div className="border-t border-bg-active pt-4">
        <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
          Invite User
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inviteUserId}
            onChange={(e) => setInviteUserId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="@user:matrix.org"
            className="flex-1 rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteUserId.trim()}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {inviting ? "..." : "Invite"}
          </button>
        </div>
      </div>

      {/* Space ID */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
          Space ID
        </label>
        <div className="flex items-center gap-2 rounded-sm bg-bg-input p-2.5 text-xs text-text-muted">
          <span className="flex-1 truncate">{spaceId}</span>
          <button
            onClick={() => navigator.clipboard.writeText(spaceId)}
            className="flex-shrink-0 rounded p-1 text-text-muted hover:text-text-primary"
            title="Copy Space ID"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}
      {successMsg && <p className="text-sm text-green">{successMsg}</p>}
    </div>
  );
}

/* ──────── Members Tab ──────── */
const EMPTY_MEMBERS: Member[] = [];

function MembersTab({ spaceId, userId }: { spaceId: string; userId: string | null }) {
  const membersByRoom = useMemberStore((s) => s.membersByRoom);
  const members = membersByRoom.get(spaceId) ?? EMPTY_MEMBERS;
  const updateMemberPowerLevel = useMemberStore((s) => s.updateMemberPowerLevel);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myPowerLevel, setMyPowerLevel] = useState(0);

  const client = getMatrixClient();
  const assignableRoles = getAssignableRoles();
  const roleOptions = useMemo(
    () => assignableRoles.map((r) => ({ value: r.name, label: r.name })),
    [assignableRoles]
  );

  // Load members when tab opens
  useEffect(() => {
    if (client && spaceId) {
      syncRoomMembers(client, spaceId);
    }
  }, [client, spaceId]);

  useEffect(() => {
    if (!client || !spaceId || !userId) return;
    const matrixRoom = client.getRoom(spaceId);
    if (!matrixRoom) return;
    const powerLevels = matrixRoom.currentState
      .getStateEvents("m.room.power_levels", "")
      ?.getContent();
    setMyPowerLevel(powerLevels?.users?.[userId] ?? powerLevels?.users_default ?? 0);
  }, [spaceId, userId, client]);

  const sorted = [...members].sort((a, b) => {
    if (a.powerLevel !== b.powerLevel) return b.powerLevel - a.powerLevel;
    return a.displayName.localeCompare(b.displayName);
  });

  const handleKick = async (targetUserId: string) => {
    if (!client) return;
    setActionLoading(targetUserId);
    setError(null);
    try {
      await client.kick(spaceId, targetUserId, "Kicked by admin");
      syncRoomMembers(client, spaceId);
    } catch (err) {
      console.error("Failed to kick:", err);
      setError(err instanceof Error ? err.message : "Failed to kick user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async (targetUserId: string) => {
    if (!client) return;
    setActionLoading(targetUserId);
    setError(null);
    try {
      await client.ban(spaceId, targetUserId, "Banned by admin");
      syncRoomMembers(client, spaceId);
    } catch (err) {
      console.error("Failed to ban:", err);
      setError(err instanceof Error ? err.message : "Failed to ban user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetRole = async (targetUserId: string, roleName: string) => {
    if (!client) return;
    const newLevel = getPowerLevelForRoleName(roleName);
    const member = members.find((m) => m.userId === targetUserId);
    if (!member || member.powerLevel === newLevel) return;
    const previousLevel = member.powerLevel;
    setActionLoading(targetUserId);
    setError(null);
    updateMemberPowerLevel(spaceId, targetUserId, newLevel);
    try {
      await client.setPowerLevel(spaceId, targetUserId, newLevel);
      syncRoomMembers(client, spaceId);
    } catch (err) {
      console.error("Failed to set role:", err);
      updateMemberPowerLevel(spaceId, targetUserId, previousLevel);
      setError(err instanceof Error ? err.message : "Failed to set role");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-text-muted">{members.length} members</p>
      <div className="max-h-80 overflow-y-auto">
        {sorted.map((member) => {
          const role = getRoleForPowerLevel(member.powerLevel);
          const canManage = myPowerLevel > member.powerLevel && member.userId !== userId;
          const canChangeRole = canManage && myPowerLevel >= POWER_LEVEL_OWNER;
          const isLoading = actionLoading === member.userId;

          return (
            <div
              key={member.userId}
              className="group flex items-center gap-3 rounded-sm px-2 py-2 hover:bg-bg-hover"
            >
              <Avatar
                name={member.displayName}
                url={member.avatarUrl}
                mxcUrl={member.mxcAvatarUrl}
                size={36}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {member.displayName}
                  </span>
                  {role && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${role.colorClass}`}
                      title={role.description}
                    >
                      {role.name}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-text-muted">{member.userId}</p>
              </div>
              <div className="flex items-center gap-1">
                {canChangeRole && !isLoading && (
                  <ThemedSelect
                    value={role?.name ?? "Member"}
                    onChange={(v) => handleSetRole(member.userId, v)}
                    options={roleOptions}
                    title="Change role"
                    className="w-28"
                  />
                )}
                {canManage && !isLoading && (
                  <div className="hidden gap-1 group-hover:flex">
                    <button
                      onClick={() => handleKick(member.userId)}
                      className="rounded p-1 text-text-muted hover:bg-bg-active hover:text-yellow"
                      title="Kick"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleBan(member.userId)}
                      className="rounded p-1 text-text-muted hover:bg-bg-active hover:text-red"
                      title="Ban"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M4.93 4.93l14.14 14.14" />
                      </svg>
                    </button>
                  </div>
                )}
                {isLoading && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-muted/30 border-t-text-muted" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red">{error}</p>}
    </div>
  );
}
