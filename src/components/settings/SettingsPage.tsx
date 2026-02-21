import { useState, useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";
import { ProfileSection } from "./ProfileSection";
import { PrivacySection } from "./PrivacySection";
import { AppearanceSection } from "./AppearanceSection";
import { NotificationsSection } from "./NotificationsSection";
import { SessionsSection } from "./SessionsSection";
import { VoiceVideoSection } from "./VoiceVideoSection";
import { AboutSection } from "./AboutSection";
import { DiagnosticsSection } from "./DiagnosticsSection";
import { destroyMatrixClient } from "@/lib/matrix";
import { useAuthStore } from "@/stores/authStore";
import { useRoomStore } from "@/stores/roomStore";

type SettingsTab =
  | "profile"
  | "privacy"
  | "appearance"
  | "notifications"
  | "voicevideo"
  | "sessions"
  | "about"
  | "diagnostics";

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: "profile", label: "My Account", icon: "user" },
  { id: "privacy", label: "Privacy & Safety", icon: "shield" },
  { id: "appearance", label: "Appearance", icon: "palette" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "voicevideo", label: "Voice & Video", icon: "mic" },
  { id: "sessions", label: "Sessions", icon: "devices" },
  { id: "about", label: "About", icon: "info" },
  { id: "diagnostics", label: "Diagnostics", icon: "activity" },
];

function TabIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "user":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "shield":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "palette":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="12" r="1.5" fill="currentColor" />
          <circle cx="16" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="16" r="1.5" fill="currentColor" />
        </svg>
      );
    case "bell":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
      );
    case "mic":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
        </svg>
      );
    case "devices":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      );
    case "info":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
    case "activity":
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 8-4-16-3 8H2" />
        </svg>
      );
    default:
      return null;
  }
}

export function SettingsPage() {
  const closeModal = useUiStore((s) => s.closeModal);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const resetRoomState = useRoomStore((s) => s.resetState);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [closeModal]);

  const handleLogout = async () => {
    await destroyMatrixClient();
    resetRoomState();
    useAuthStore.getState().logout();
    closeModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-bg-tertiary">
      {/* Sidebar */}
      <div className="flex w-56 flex-col bg-bg-secondary">
        <div className="flex-1 overflow-y-auto px-2 py-6">
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-text-muted">
            User Settings
          </p>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mb-0.5 flex w-full items-center gap-2.5 rounded-sm px-3 py-1.5 text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-bg-active text-text-primary"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <TabIcon icon={tab.icon} />
              {tab.label}
            </button>
          ))}

          <div className="mx-3 my-3 h-px bg-bg-active" />

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-sm px-3 py-1.5 text-sm text-red hover:bg-bg-hover"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Log Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button
            onClick={closeModal}
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-text-muted/40 text-text-muted transition-colors hover:border-text-primary hover:text-text-primary"
            title="Close (Esc)"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-10 pb-16">
          <div className="mx-auto max-w-2xl">
            {activeTab === "profile" && <ProfileSection />}
            {activeTab === "privacy" && <PrivacySection />}
            {activeTab === "appearance" && <AppearanceSection />}
            {activeTab === "notifications" && <NotificationsSection />}
            {activeTab === "voicevideo" && <VoiceVideoSection />}
            {activeTab === "sessions" && <SessionsSection />}
            {activeTab === "about" && <AboutSection />}
            {activeTab === "diagnostics" && <DiagnosticsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
