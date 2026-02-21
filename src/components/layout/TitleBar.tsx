import { getCurrentWindow } from "@tauri-apps/api/window";
import type { MouseEvent } from "react";

const appWindow = getCurrentWindow();

export function TitleBar() {
  const runWindowAction = (action: "minimize" | "toggleMaximize" | "close") => {
    appWindow[action]().catch((err) => {
      console.error(`[titlebar] Failed to ${action}:`, err);
    });
  };

  const handleDragStart = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    appWindow.startDragging().catch((err) => {
      console.error("[titlebar] Failed to start dragging:", err);
    });
  };

  return (
    <div
      className="flex h-8 w-full select-none items-center bg-bg-tertiary"
      onMouseDown={handleDragStart}
    >
      <div
        className="flex flex-1 items-center pl-3 text-xs font-semibold text-text-muted"
      >
        Concord
      </div>

      <div
        className="flex"
        aria-label="Window controls"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => runWindowAction("minimize")}
          className="inline-flex h-8 w-12 items-center justify-center text-text-muted hover:bg-bg-hover hover:text-text-primary"
          aria-label="Minimize window"
          type="button"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
            <rect y="5" width="12" height="2" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => runWindowAction("toggleMaximize")}
          className="inline-flex h-8 w-12 items-center justify-center text-text-muted hover:bg-bg-hover hover:text-text-primary"
          aria-label="Toggle maximize window"
          type="button"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="10" height="10" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => runWindowAction("close")}
          className="inline-flex h-8 w-12 items-center justify-center text-text-muted hover:bg-red hover:text-white"
          aria-label="Close window"
          type="button"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
