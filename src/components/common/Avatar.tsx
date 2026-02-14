interface AvatarProps {
  name: string;
  url: string | null;
  size?: number;
}

const COLORS = [
  "#5865f2", "#57f287", "#fee75c", "#eb459e",
  "#ed4245", "#f47b67", "#45ddc0", "#5dadec",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, url, size = 40 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="flex-shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
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
}
