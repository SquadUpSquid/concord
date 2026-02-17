import { useState, useRef, useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useRoomStore } from "@/stores/roomStore";
import { PinnedMessages } from "./PinnedMessages";
import { SearchPanel } from "./SearchPanel";

interface ChatHeaderProps {
  name: string;
  topic: string | null;
}

export function ChatHeader({ name, topic }: ChatHeaderProps) {
  const toggleMembers = useUiStore((s) => s.toggleMemberSidebar);
  const showMembers = useUiStore((s) => s.showMemberSidebar);
  const openModal = useUiStore((s) => s.openModal);
  const selectedRoomId = useRoomStore((s) => s.selectedRoomId);
  const [showPinned, setShowPinned] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close panels on outside click
  useEffect(() => {
    if (!showPinned && !showSearch) return;
    const handleClick = (e: MouseEvent) => {
      if (showPinned && pinnedRef.current && !pinnedRef.current.contains(e.target as Node)) {
        setShowPinned(false);
      }
      if (showSearch && searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showPinned, showSearch]);

  return (
    <div className="flex h-12 items-center border-b border-bg-tertiary px-4 shadow-sm">
      <span className="mr-1 text-text-muted">#</span>
      <h3 className="font-semibold text-text-primary">{name}</h3>
      {topic && (
        <>
          <div className="mx-3 h-6 w-px bg-bg-active" />
          <p className="flex-1 truncate text-sm text-text-muted">{topic}</p>
        </>
      )}
      <div className="ml-auto flex items-center gap-1">
        {/* Search */}
        <div className="relative" ref={searchRef}>
          <button
            onClick={() => { setShowSearch(!showSearch); setShowPinned(false); }}
            className={`rounded p-1.5 transition-colors ${
              showSearch ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
            title="Search messages"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          {showSearch && selectedRoomId && (
            <SearchPanel roomId={selectedRoomId} onClose={() => setShowSearch(false)} />
          )}
        </div>

        {/* Pinned messages */}
        <div className="relative" ref={pinnedRef}>
          <button
            onClick={() => { setShowPinned(!showPinned); setShowSearch(false); }}
            className={`rounded p-1.5 transition-colors ${
              showPinned ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
            title="Pinned messages"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 4.5l-4 4L7 10l-1.5 1.5 7 7L14 17l1.5-4 4-4" />
              <path d="M9 15l-4.5 4.5" />
              <path d="M14.5 4L20 9.5" />
            </svg>
          </button>
          {showPinned && selectedRoomId && (
            <PinnedMessages roomId={selectedRoomId} onClose={() => setShowPinned(false)} />
          )}
        </div>

        {/* Settings */}
        <button
          onClick={() => openModal("roomSettings")}
          className="rounded p-1.5 text-text-muted hover:text-text-primary"
          title="Channel settings"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>

        {/* Members */}
        <button
          onClick={toggleMembers}
          className={`rounded p-1.5 transition-colors ${
            showMembers ? "bg-bg-active text-text-primary" : "text-text-muted hover:text-text-primary"
          }`}
          title="Toggle member list"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
