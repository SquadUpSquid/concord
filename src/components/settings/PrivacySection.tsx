import { useSettingsStore } from "@/stores/settingsStore";
import { SettingsToggle } from "./SettingsToggle";

export function PrivacySection() {
  const sendReadReceipts = useSettingsStore((s) => s.sendReadReceipts);
  const setSendReadReceipts = useSettingsStore((s) => s.setSendReadReceipts);
  const sendTypingIndicators = useSettingsStore((s) => s.sendTypingIndicators);
  const setSendTypingIndicators = useSettingsStore((s) => s.setSendTypingIndicators);
  const allowDmFromAnyone = useSettingsStore((s) => s.allowDmFromAnyone);
  const setAllowDmFromAnyone = useSettingsStore((s) => s.setAllowDmFromAnyone);

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-text-primary">Privacy & Safety</h2>
      <p className="mb-6 text-sm text-text-muted">
        Control who can contact you and what information is shared with other users.
      </p>

      {/* Direct Messages */}
      <div className="mb-6 rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-3 text-sm font-bold uppercase text-text-secondary">
          Direct Messages
        </h3>
        <SettingsToggle
          label="Allow direct messages from anyone"
          description="When disabled, only users who share a space with you can send direct messages."
          checked={allowDmFromAnyone}
          onChange={setAllowDmFromAnyone}
        />
      </div>

      {/* Activity Privacy */}
      <div className="mb-6 rounded-lg bg-bg-secondary p-5">
        <h3 className="mb-3 text-sm font-bold uppercase text-text-secondary">
          Activity Privacy
        </h3>
        <SettingsToggle
          label="Send read receipts"
          description="Let other people know when you've read their messages. Your read status will be visible to others in the room."
          checked={sendReadReceipts}
          onChange={setSendReadReceipts}
        />
        <div className="h-px bg-bg-active" />
        <SettingsToggle
          label="Send typing indicators"
          description="Show others when you're typing a message. You'll also see when they're typing."
          checked={sendTypingIndicators}
          onChange={setSendTypingIndicators}
        />
      </div>

      {/* Info */}
      <div className="rounded-lg border border-bg-active bg-bg-secondary/50 p-4">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <p className="text-sm font-medium text-text-primary">About Matrix Privacy</p>
            <p className="mt-1 text-xs text-text-muted">
              Matrix is a federated protocol. Messages you send may be stored on your homeserver
              and the homeservers of other participants. End-to-end encrypted rooms ensure that
              only participants can read message content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
