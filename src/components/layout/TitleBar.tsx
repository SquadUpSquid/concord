import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex h-8 w-full items-center bg-bg-tertiary"
    >
      <div
        data-tauri-drag-region
        className="flex flex-1 items-center pl-3 text-xs font-semibold text-text-muted"
      >
        Concord
      </div>

      <div className="flex">
        <button
          onClick={() => appWindow.minimize()}
          className="inline-flex h-8 w-12 items-center justify-center text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
            <rect y="5" width="12" height="2" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="inline-flex h-8 w-12 items-center justify-center text-text-muted hover:bg-bg-hover hover:text-text-primary"
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="10" height="10" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => appWindow.close()}
          className="inline-flex h-8 w-12 items-center justify-center text-text-muted hover:bg-red hover:text-white"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
