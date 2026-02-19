import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useAuthStore } from "@/stores/authStore";
import { useMatrixMedia, fetchMediaBlob } from "@/utils/useMatrixImage";
import { useMatrixImage } from "@/utils/useMatrixImage";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { EmojiText } from "@/components/common/Emoji";
import { useCustomEmojiStore } from "@/stores/customEmojiStore";
import type { EncryptedFileInfo } from "@/stores/messageStore";

const MENTION_REGEX = /@([a-zA-Z0-9._=-]+:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const CUSTOM_EMOJI_REGEX = /:([a-zA-Z0-9_]+):/g;

function InlineCustomEmoji({ mxcUrl, shortcode }: { mxcUrl: string; shortcode: string }) {
  const { src } = useMatrixImage(mxcUrl, 48, 48);
  return (
    <img
      src={src ?? undefined}
      alt={`:${shortcode}:`}
      title={`:${shortcode}:`}
      className="inline-block h-5 w-5 align-text-bottom object-contain"
      draggable={false}
    />
  );
}

function replaceCustomEmojis(text: string, roomId: string | undefined, keyBase: number): ReactNode[] {
  if (!roomId) return [text];
  const resolveShortcode = useCustomEmojiStore.getState().resolveShortcode;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(CUSTOM_EMOJI_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    const shortcode = match[1];
    const mxcUrl = resolveShortcode(roomId, shortcode);
    if (mxcUrl) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(<InlineCustomEmoji key={`ce-${keyBase}-${match.index}`} mxcUrl={mxcUrl} shortcode={shortcode} />);
      lastIndex = regex.lastIndex;
    }
  }

  if (lastIndex === 0) return [text];
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

function highlightMentions(text: string, myUserId: string | null): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(MENTION_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const fullMention = match[0];
    const isMe = fullMention === myUserId;
    parts.push(
      <span
        key={match.index}
        className={`rounded px-1 py-0.5 font-medium ${
          isMe
            ? "bg-accent/30 text-accent"
            : "bg-accent/15 text-accent"
        }`}
      >
        {fullMention}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function ImageMessage({ url, body, file, mimetype }: { url: string; body: string; file?: EncryptedFileInfo | null; mimetype?: string }) {
  const [showLightbox, setShowLightbox] = useState(false);
  const { src, loading } = useMatrixMedia(url, file, mimetype);

  return (
    <div className="message-content my-1">
      {showLightbox && src && (
        <ImageLightbox
          src={src}
          mxcUrl={url}
          file={file}
          mimetype={mimetype}
          alt={body}
          onClose={() => setShowLightbox(false)}
        />
      )}
      <button onClick={() => setShowLightbox(true)} className="block">
        {loading ? (
          <div className="flex h-[200px] w-[300px] animate-pulse items-center justify-center rounded-lg bg-bg-secondary">
            <svg className="h-8 w-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        ) : src ? (
          <img
            src={src}
            alt={body}
            className="max-h-[300px] max-w-[400px] cursor-pointer rounded-lg object-contain transition-opacity hover:opacity-90"
          />
        ) : (
          <div className="flex h-[100px] w-[200px] items-center justify-center rounded-lg bg-bg-secondary text-xs text-text-muted">
            Image failed to load
          </div>
        )}
      </button>
      {body && !body.startsWith("image") && (
        <p className="mt-1 text-xs text-text-muted">{body}</p>
      )}
    </div>
  );
}

function VideoMessage({ url, file, mimetype }: { url: string; file?: EncryptedFileInfo | null; mimetype?: string }) {
  const { src, loading } = useMatrixMedia(url, file, mimetype);

  if (loading) {
    return (
      <div className="message-content my-1">
        <div className="flex h-[200px] w-[350px] animate-pulse items-center justify-center rounded-lg bg-bg-secondary">
          <svg className="h-10 w-10 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="message-content my-1">
      {src ? (
        <video src={src} controls className="max-h-[300px] max-w-[400px] rounded-lg" preload="metadata" />
      ) : (
        <div className="flex h-[60px] w-[300px] items-center justify-center rounded-lg bg-bg-secondary text-xs text-text-muted">
          Video failed to load
        </div>
      )}
    </div>
  );
}

function AudioMessage({ url, file, mimetype }: { url: string; file?: EncryptedFileInfo | null; mimetype?: string }) {
  const { src, loading } = useMatrixMedia(url, file, mimetype);

  if (loading) {
    return (
      <div className="message-content my-1">
        <div className="h-[54px] w-[300px] animate-pulse rounded-full bg-bg-secondary" />
      </div>
    );
  }

  return (
    <div className="message-content my-1">
      {src ? (
        <audio src={src} controls preload="metadata" className="max-w-[400px]" />
      ) : (
        <div className="flex h-[40px] w-[300px] items-center justify-center rounded-lg bg-bg-secondary text-xs text-text-muted">
          Audio failed to load
        </div>
      )}
    </div>
  );
}

function FileMessage({ url, body, info, file }: { url: string; body: string; info?: { mimetype?: string; size?: number; w?: number; h?: number }; file?: EncryptedFileInfo | null }) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const sizeStr = info?.size ? formatFileSize(info.size) : "";

  const handleDownload = async () => {
    setDownloading(true);
    setDone(false);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      const blob = await fetchMediaBlob(url, file, info?.mimetype);
      if (!blob) throw new Error("Failed to fetch file");

      const ext = body.includes(".") ? body.split(".").pop() : undefined;
      const filePath = await save({
        defaultPath: body,
        filters: ext ? [{ name: "File", extensions: [ext] }] : undefined,
      });
      if (!filePath) return;

      const arrayBuf = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuf));
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error("Failed to save file:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="message-content my-1">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex w-full items-center gap-2 rounded-lg bg-bg-secondary p-3 text-left transition-colors hover:bg-bg-active disabled:opacity-60"
      >
        <svg className="h-8 w-8 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-link">{body}</p>
          {sizeStr && <p className="text-xs text-text-muted">{sizeStr}</p>}
        </div>
        {downloading ? (
          <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-text-muted border-t-accent" />
        ) : done ? (
          <svg className="h-5 w-5 flex-shrink-0 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg className="h-5 w-5 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        )}
      </button>
    </div>
  );
}

interface MessageContentProps {
  body: string;
  formattedBody: string | null;
  msgtype?: string;
  url?: string;
  info?: { mimetype?: string; size?: number; w?: number; h?: number };
  file?: EncryptedFileInfo | null;
  roomId?: string;
}

export function MessageContent({ body, formattedBody: _formattedBody, msgtype, url, info, file, roomId }: MessageContentProps) {
  if (msgtype === "m.image" && url) return <ImageMessage url={url} body={body} file={file} mimetype={info?.mimetype} />;
  if (msgtype === "m.video" && url) return <VideoMessage url={url} file={file} mimetype={info?.mimetype} />;
  if (msgtype === "m.audio" && url) return <AudioMessage url={url} file={file} mimetype={info?.mimetype} />;
  if (msgtype === "m.file" && url) return <FileMessage url={url} body={body} info={info} file={file} />;

  // Text message (default) — render as markdown
  const myUserId = useAuthStore.getState().userId;
  const isMentioned = myUserId ? body.includes(myUserId) : false;

  return (
    <div className={`message-content text-sm text-text-secondary ${isMentioned ? "border-l-2 border-accent pl-2" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ children }) => {
            const processText = (text: string, keyBase: number): ReactNode[] => {
              const mentionParts = highlightMentions(text, myUserId);
              const result: ReactNode[] = [];
              mentionParts.forEach((part, j) => {
                if (typeof part === "string") {
                  const customParts = replaceCustomEmojis(part, roomId, keyBase + j * 100);
                  customParts.forEach((cp, k) => {
                    if (typeof cp === "string") {
                      result.push(<EmojiText key={`${keyBase}-${j}-${k}`} text={cp} emojiSize={20} />);
                    } else {
                      result.push(cp);
                    }
                  });
                } else {
                  result.push(part);
                }
              });
              return result;
            };
            const processed = Array.isArray(children)
              ? children.map((child, i) =>
                  typeof child === "string" ? <span key={i}>{processText(child, i * 1000)}</span> : child
                )
              : typeof children === "string"
                ? processText(children, 0)
                : children;
            return <p className="mb-1 last:mb-0">{processed}</p>;
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-link hover:underline"
            >
              {children}
            </a>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = className?.startsWith("language-");
            if (isBlock) {
              return (
                <code className={`${className} block overflow-x-auto rounded bg-bg-floating p-3 text-xs`} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-bg-floating px-1.5 py-0.5 text-xs" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-1 overflow-hidden rounded bg-bg-floating">{children}</pre>
          ),
          ul: ({ children }) => (
            <ul className="mb-1 ml-4 list-disc">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-1 ml-4 list-decimal">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-1 border-l-4 border-bg-active pl-3 text-text-muted">
              {children}
            </blockquote>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
