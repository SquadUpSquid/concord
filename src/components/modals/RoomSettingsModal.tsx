import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/common/Modal";
import { Avatar } from "@/components/common/Avatar";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { useAuthStore } from "@/stores/authStore";
import { useMemberStore } from "@/stores/memberStore";
import { getMatrixClient } from "@/lib/matrix";
import { mxcToHttp } from "@/utils/matrixHelpers";
import {
  getRoleForPowerLevel,
  getAssignableRoles,
  getPowerLevelForRoleName,
  POWER_LEVEL_OWNER,
  POWER_LEVEL_ADMIN,
  POWER_LEVEL_MODERATOR,
} from "@/utils/roles";
import { syncRoomMembers } from "@/lib/matrixEventHandlers";

type Tab = "overview" | "members";

export function RoomSettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const openModal = useUiStore((s) => s.openModal);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const rooms = useRoomStore((s) => s.rooms);
  const userId = useAuthStore((s) => s.userId);

  const room = selectedRoomId ? rooms.get(selectedRoomId) : null;
  const [tab, setTab] = useState<Tab>("overview");

  if (!room) return null;

  return (
    <Modal title={`${room.name} — Settings`} onClose={closeModal} wide>
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
          <OverviewTab room={room} roomId={selectedRoomId!} userId={userId} closeModal={closeModal} />
        )}
        {tab === "members" && (
          <MembersTab roomId={selectedRoomId!} userId={userId} />
        )}

        {/* Danger zone */}
        <div className="mt-4 border-t border-bg-active pt-4">
          <button
            onClick={() => openModal("leaveRoom")}
            className="rounded-sm px-4 py-2 text-sm font-medium text-red hover:bg-red/10"
          >
            Leave Channel
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ──────── Overview Tab ──────── */
function OverviewTab({
  room,
  roomId,
  userId,
  closeModal,
}: {
  room: NonNullable<ReturnType<typeof useRoomStore.getState>["rooms"] extends Map<string, infer V> ? V : never>;
  roomId: string;
  userId: string | null;
  closeModal: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [topic, setTopic] = useState(room.topic ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [roomAvatarMxc, setRoomAvatarMxc] = useState<string | null>(null);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [canManageAccess, setCanManageAccess] = useState(false);
  const [viewAccessLevel, setViewAccessLevel] = useState(room.minPowerLevelToView ?? 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const client = getMatrixClient();
  const homeserverUrl = client?.getHomeserverUrl() ?? "";
  const updateRoom = useRoomStore((s) => s.updateRoom);

  useEffect(() => {
    if (!client || !roomId || !userId) return;
    const matrixRoom = client.getRoom(roomId);
    if (!matrixRoom) return;
    const powerLevels = matrixRoom.currentState
      .getStateEvents("m.room.power_levels", "")
      ?.getContent();
    const userPower = powerLevels?.users?.[userId] ?? powerLevels?.users_default ?? 0;
    const requiredPower = powerLevels?.events?.["m.room.name"] ?? powerLevels?.state_default ?? 50;
    setCanEdit(userPower >= requiredPower);
    setCanManageAccess(userPower >= POWER_LEVEL_ADMIN);
  }, [roomId, userId, client]);

  useEffect(() => {
    setViewAccessLevel(room.minPowerLevelToView ?? 0);
  }, [room.minPowerLevelToView]);

  const displayAvatarUrl = roomAvatarMxc
    ? mxcToHttp(roomAvatarMxc, homeserverUrl)
    : room.avatarUrl;

  const handleAvatarUpload = async (file: File) => {
    if (!client || !canEdit) return;
    if (!file.type.startsWith("image/")) { setError("Please select an image file"); return; }
    setUploadingAvatar(true);
    setError(null);
    try {
      const response = await client.uploadContent(file, { type: file.type });
      const mxcUrl = typeof response === "string" ? response : response.content_uri;
      setRoomAvatarMxc(mxcUrl);
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      setError("Failed to upload image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const accessChanged = viewAccessLevel !== (room.minPowerLevelToView ?? 0);
  const hasChanges =
    name.trim() !== room.name ||
    topic.trim() !== (room.topic ?? "") ||
    roomAvatarMxc !== null ||
    accessChanged;

  const handleSave = async () => {
    if (!client || !roomId) return;
    setSaving(true);
    setError(null);
    try {
      if (name.trim() !== room.name) {
        await client.setRoomName(roomId, name.trim());
      }
      if (topic.trim() !== (room.topic ?? "")) {
        await client.setRoomTopic(roomId, topic.trim());
      }
      if (roomAvatarMxc) {
        await client.sendStateEvent(roomId, "m.room.avatar" as any, { url: roomAvatarMxc }, "");
      }
      if (accessChanged && !room.isSpace && !room.isDm) {
        await client.sendStateEvent(
          roomId,
          "org.concord.room.access" as any,
          { minPowerLevelToView: viewAccessLevel },
          ""
        );
        updateRoom(roomId, { minPowerLevelToView: viewAccessLevel });
      }
      setSuccessMsg("Settings saved!");
      setTimeout(() => closeModal(), 600);
    } catch (err) {
      console.error("Failed to update room:", err);
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!client || !roomId || !inviteUserId.trim()) return;
    setInviting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await client.invite(roomId, inviteUserId.trim());
      setSuccessMsg(`Invited ${inviteUserId.trim()}`);
      setInviteUserId("");
    } catch (err) {
      console.error("Failed to invite:", err);
      setError(err instanceof Error ? err.message : "Failed to invite user");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Room avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar name={room.name} url={displayAvatarUrl} size={64} />
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
          Channel Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!canEdit}
          className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
        />
      </div>

      {/* Topic */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
          Topic
        </label>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={!canEdit}
          placeholder="What is this channel about?"
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

      {/* Channel access (who can view) — only for channels, not spaces/DMs */}
      {!room.isSpace && !room.isDm && canManageAccess && (
        <div className="border-t border-bg-active pt-4">
          <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
            Who can view this channel
          </label>
          <p className="mb-2 text-xs text-text-muted">
            Only users with at least this role will see the channel in the list.
          </p>
          <select
            value={viewAccessLevel}
            onChange={(e) => setViewAccessLevel(Number(e.target.value))}
            className="w-full rounded-sm border border-bg-active bg-bg-input px-3 py-2 text-sm text-text-primary outline-none focus:ring-2 focus:ring-accent"
          >
            <option value={0}>Everyone (Member+)</option>
            <option value={POWER_LEVEL_MODERATOR}>Moderator and above</option>
            <option value={POWER_LEVEL_ADMIN}>Admin and above</option>
            <option value={POWER_LEVEL_OWNER}>Owner only</option>
          </select>
        </div>
      )}

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

      {/* Room ID */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase text-text-secondary">
          Room ID
        </label>
        <div className="flex items-center gap-2 rounded-sm bg-bg-input p-2.5 text-xs text-text-muted">
          <span className="flex-1 truncate">{roomId}</span>
          <button
            onClick={() => navigator.clipboard.writeText(roomId)}
            className="flex-shrink-0 rounded p-1 text-text-muted hover:text-text-primary"
            title="Copy Room ID"
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
function MembersTab({ roomId, userId }: { roomId: string; userId: string | null }) {
  const members = useMemberStore((s) => s.membersByRoom.get(roomId) ?? []);
  const updateMemberPowerLevel = useMemberStore((s) => s.updateMemberPowerLevel);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [myPowerLevel, setMyPowerLevel] = useState(0);

  const client = getMatrixClient();
  const assignableRoles = getAssignableRoles();

  useEffect(() => {
    if (!client || !roomId || !userId) return;
    const matrixRoom = client.getRoom(roomId);
    if (!matrixRoom) return;
    const powerLevels = matrixRoom.currentState
      .getStateEvents("m.room.power_levels", "")
      ?.getContent();
    setMyPowerLevel(powerLevels?.users?.[userId] ?? powerLevels?.users_default ?? 0);
  }, [roomId, userId, client]);

  const sorted = [...members].sort((a, b) => {
    if (a.powerLevel !== b.powerLevel) return b.powerLevel - a.powerLevel;
    return a.displayName.localeCompare(b.displayName);
  });

  const handleKick = async (targetUserId: string) => {
    if (!client) return;
    setActionLoading(targetUserId);
    setError(null);
    try {
      await client.kick(roomId, targetUserId, "Kicked by admin");
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
      await client.ban(roomId, targetUserId, "Banned by admin");
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
    updateMemberPowerLevel(roomId, targetUserId, newLevel);
    try {
      await client.setPowerLevel(roomId, targetUserId, newLevel);
      syncRoomMembers(client, roomId);
    } catch (err) {
      console.error("Failed to set role:", err);
      updateMemberPowerLevel(roomId, targetUserId, previousLevel);
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
                  <select
                    value={role?.name ?? "Member"}
                    onChange={(e) => handleSetRole(member.userId, e.target.value)}
                    className="rounded border border-bg-active bg-bg-input px-2 py-1 text-xs text-text-primary outline-none focus:ring-1 focus:ring-accent"
                    title="Change role"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
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
