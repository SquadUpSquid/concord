import { useRoomStore } from "@/stores/roomStore";
import { useSettingsStore } from "@/stores/settingsStore";

let permissionGranted = false;

export function requestNotificationPermission(): void {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    permissionGranted = true;
    return;
  }
  if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      permissionGranted = perm === "granted";
    });
  }
}

export function sendMessageNotification(
  senderName: string,
  body: string,
  roomId: string,
  roomName: string,
  isMention?: boolean
): void {
  const settings = useSettingsStore.getState();
  if (!settings.enableNotifications) return;
  if (settings.notifyOnMentionsOnly && !isMention) return;

  if (!permissionGranted && Notification.permission !== "granted") return;

  if (document.hasFocus()) {
    const currentRoomId = useRoomStore.getState().selectedRoomId;
    if (currentRoomId === roomId) return;
  }

  const truncatedBody = body.length > 100 ? body.slice(0, 100) + "..." : body;

  const notification = new Notification(`${senderName} in ${roomName}`, {
    body: truncatedBody,
    tag: roomId,
    silent: !settings.enableNotificationSounds,
  });

  notification.onclick = () => {
    window.focus();
    useRoomStore.getState().selectRoom(roomId);
    notification.close();
  };

  setTimeout(() => notification.close(), 5000);
}

export function updateTitleWithUnread(): void {
  const rooms = useRoomStore.getState().rooms;
  let total = 0;
  for (const room of rooms.values()) {
    if (room.membership === "join") total += room.unreadCount;
  }

  document.title = total > 0 ? `(${total}) Concord` : "Concord";
}
