import { memo, type ReactNode } from "react";
import twemoji from "@twemoji/api";

const CDN_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/";

const urlCache = new Map<string, string>();

function emojiToUrl(emoji: string): string | null {
  const cached = urlCache.get(emoji);
  if (cached) return cached;

  if (!twemoji.test(emoji)) return null;

  const codepoint = twemoji.convert.toCodePoint(
    emoji.indexOf("\u200D") < 0 ? emoji.replace(/\uFE0F/g, "") : emoji,
  );
  const url = `${CDN_BASE}${codepoint}.svg`;
  urlCache.set(emoji, url);
  return url;
}

interface EmojiProps {
  emoji: string;
  size?: number;
  className?: string;
}

/**
 * Renders a single Unicode emoji as a Twemoji SVG image for consistent
 * cross-platform display (avoids grey system glyphs on WebKitGTK/Linux).
 */
export const Emoji = memo(function Emoji({ emoji, size = 20, className = "" }: EmojiProps) {
  const url = emojiToUrl(emoji);
  if (!url) return <span>{emoji}</span>;

  return (
    <img
      src={url}
      alt={emoji}
      draggable={false}
      className={`inline-block flex-shrink-0 align-text-bottom ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  );
});

const EMOJI_REGEX =
  /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Regional_Indicator}{2}|[\u{1F3F4}][\u{E0060}-\u{E007F}]+)/gu;

interface EmojiTextProps {
  text: string;
  emojiSize?: number;
  className?: string;
}

/**
 * Renders a text string with any Unicode emojis replaced by Twemoji images.
 * Non-emoji text is left as-is.
 */
export const EmojiText = memo(function EmojiText({
  text,
  emojiSize = 20,
  className = "",
}: EmojiTextProps) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  EMOJI_REGEX.lastIndex = 0;
  while ((match = EMOJI_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const emoji = match[0];
    const url = emojiToUrl(emoji);
    if (url) {
      parts.push(
        <img
          key={`${match.index}-${emoji}`}
          src={url}
          alt={emoji}
          draggable={false}
          className="inline-block align-text-bottom"
          style={{ width: emojiSize, height: emojiSize }}
        />,
      );
    } else {
      parts.push(emoji);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return <>{text}</>;

  return <span className={className}>{parts}</span>;
});
