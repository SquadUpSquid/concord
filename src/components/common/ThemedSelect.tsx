import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface ThemedSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  title?: string;
  placeholder?: string;
}

export function ThemedSelect({
  value,
  options,
  onChange,
  className = "",
  title,
  placeholder,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && listRef.current) {
      const active = listRef.current.querySelector("[data-active]");
      if (active) {
        active.scrollIntoView({ block: "nearest" });
      }
    }
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`} title={title}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-sm border border-bg-active bg-bg-input px-3 py-2 text-left text-sm text-text-primary outline-none transition-colors hover:border-text-muted/50 focus:ring-2 focus:ring-accent"
      >
        <span className={selected ? "" : "text-text-muted"}>
          {selected?.label ?? placeholder ?? "Select..."}
        </span>
        <svg
          className={`ml-2 h-4 w-4 flex-shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute left-0 z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-bg-active bg-bg-floating py-1 shadow-xl"
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                data-active={isActive ? "" : undefined}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-accent/20 text-text-primary"
                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                }`}
              >
                {opt.label}
                {isActive && (
                  <svg
                    className="ml-auto h-4 w-4 flex-shrink-0 text-accent"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
