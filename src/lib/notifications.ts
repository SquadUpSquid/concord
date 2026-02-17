import { useRoomStore } from "@/stores/roomStore";

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
  roomName: string
): void {
  if (!permissionGranted && Notification.permission !== "granted") return;

  // Don't notify if the window is focused and we're viewing this room
  if (document.hasFocus()) {
    const currentRoomId = useRoomStore.getState().selectedRoomId;
    if (currentRoomId === roomId) return;
  }

  const truncatedBody = body.length > 100 ? body.slice(0, 100) + "..." : body;

  const notification = new Notification(`${senderName} in ${roomName}`, {
    body: truncatedBody,
    tag: roomId,
    silent: false,
  });

  notification.onclick = () => {
    window.focus();
    useRoomStore.getState().selectRoom(roomId);
    notification.close();
  };

  // Auto-close after 5 seconds
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
