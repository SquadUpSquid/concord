import { useSettingsStore } from "@/stores/settingsStore";
import { SettingsToggle } from "./SettingsToggle";

export function NotificationsSection() {
  const enableNotifications = useSettingsStore((s) => s.enableNotifications);
  const setEnableNotifications = useSettingsStore((s) => s.setEnableNotifications);
  const enableNotificationSounds = useSettingsStore((s) => s.enableNotificationSounds);
  const setEnableNotificationSounds = useSettingsStore((s) => s.setEnableNotificationSounds);
  const notifyOnMentionsOnly = useSettingsStore((s) => s.notifyOnMentionsOnly);
  const setNotifyOnMentionsOnly = useSettingsStore((s) => s.setNotifyOnMentionsOnly);

  const permissionState =
    typeof Notification !== "undefined" ? Notification.permission : "unavailable";

  const handleRequestPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    if (result === "granted") setEnableNotifications(true);
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">Notifications</h2>
      <p className="mb-6 text-sm text-text-muted">
        Configure how and when Concord notifies you about new messages.
      </p>

      {/* Browser permission banner */}
      {permissionState === "denied" && (
        <div className="mb-6 rounded-lg border border-red/30 bg-red/10 p-4">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M15 9l-6 6M9 9l6 6" />
            </svg>
            <div>
              <p className="text-sm font-medium text-text-primary">Notifications blocked</p>
              <p className="mt-1 text-xs text-text-muted">
                Browser notifications are blocked. Please enable them in your browser settings
                to receive desktop notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {permissionState === "default" && (
        <div className="mb-6 rounded-lg border border-yellow/30 bg-yellow/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Enable desktop notifications</p>
              <p className="mt-1 text-xs text-text-muted">
                Grant permission to receive notifications when someone messages you.
              </p>
            </div>
            <button
              onClick={handleRequestPermission}
              className="flex-shrink-0 rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Enable
            </button>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="mb-6 rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-3 text-sm font-bold uppercase text-text-secondary">
          Desktop Notifications
        </h3>
        <SettingsToggle
          label="Enable notifications"
          description="Show desktop notifications for new messages."
          checked={enableNotifications}
          onChange={setEnableNotifications}
        />
        <div className="h-px bg-bg-active" />
        <SettingsToggle
          label="Notification sounds"
          description="Play a sound when a notification arrives."
          checked={enableNotificationSounds}
          onChange={setEnableNotificationSounds}
        />
        <div className="h-px bg-bg-active" />
        <SettingsToggle
          label="Only notify for @mentions"
          description="Only receive notifications when you are directly mentioned."
          checked={notifyOnMentionsOnly}
          onChange={setNotifyOnMentionsOnly}
        />
      </div>
    </div>
  );
}
