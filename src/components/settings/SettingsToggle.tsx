interface SettingsToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function SettingsToggle({ label, description, checked, onChange }: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="mr-4">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
          checked ? "bg-green" : "bg-bg-active"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
