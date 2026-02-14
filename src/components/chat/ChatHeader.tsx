import { useUiStore } from "@/stores/uiStore";

interface ChatHeaderProps {
  name: string;
  topic: string | null;
}

export function ChatHeader({ name, topic }: ChatHeaderProps) {
  const toggleMembers = useUiStore((s) => s.toggleMemberSidebar);
  const showMembers = useUiStore((s) => s.showMemberSidebar);

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
      <div className="ml-auto flex gap-2">
        <button
          onClick={toggleMembers}
          className={`rounded p-1.5 transition-colors ${
            showMembers
              ? "bg-bg-active text-text-primary"
              : "text-text-muted hover:text-text-primary"
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
