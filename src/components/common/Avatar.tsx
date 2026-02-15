import { PresenceStatus } from "@/stores/presenceStore";

interface AvatarProps {
  name: string;
  url: string | null;
  size?: number;
  presence?: PresenceStatus | null;
}

const COLORS = [
  "#5865f2", "#57f287", "#fee75c", "#eb459e",
  "#ed4245", "#f47b67", "#45ddc0", "#5dadec",
];

const PRESENCE_COLORS: Record<PresenceStatus, string> = {
  online: "bg-green",
  unavailable: "bg-yellow",
  offline: "bg-text-muted",
};

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, url, size = 40, presence }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dotSize = Math.max(10, size * 0.3);

  const avatar = url ? (
    <img
      src={url}
      alt={name}
      className="flex-shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: getColor(name),
        fontSize: size * 0.4,
      }}
    >
      <span className="font-medium text-white">{initials}</span>
    </div>
  );

  if (!presence) return avatar;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {avatar}
      <div
        className={`absolute bottom-0 right-0 rounded-full border-2 border-bg-primary ${PRESENCE_COLORS[presence]}`}
        style={{ width: dotSize, height: dotSize }}
      />
    </div>
  );
}
