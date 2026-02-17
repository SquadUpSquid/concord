import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getMatrixClient } from "@/lib/matrix";
import { useAuthStore } from "@/stores/authStore";
import { mxcToHttp, mxcToFullUrl } from "@/utils/matrixHelpers";
import { ImageLightbox } from "@/components/common/ImageLightbox";

const MENTION_REGEX = /@([a-zA-Z0-9._=-]+:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

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

interface MessageContentProps {
  body: string;
  formattedBody: string | null;
  msgtype?: string;
  url?: string;
  info?: { mimetype?: string; size?: number; w?: number; h?: number };
}

export function MessageContent({ body, formattedBody: _formattedBody, msgtype, url, info }: MessageContentProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const client = getMatrixClient();
  const homeserverUrl = client?.getHomeserverUrl() ?? "";

  // Image message
  if (msgtype === "m.image" && url) {
    const thumbUrl = mxcToHttp(url, homeserverUrl, 800, 600);
    const fullUrl = mxcToFullUrl(url, homeserverUrl);
    return (
      <div className="message-content my-1">
        {lightboxSrc && (
          <ImageLightbox
            src={lightboxSrc}
            alt={body}
            onClose={() => setLightboxSrc(null)}
          />
        )}
        <button onClick={() => setLightboxSrc(fullUrl ?? thumbUrl ?? "")} className="block">
          <img
            src={thumbUrl ?? undefined}
            alt={body}
            className="max-h-[300px] max-w-[400px] cursor-pointer rounded-lg object-contain transition-opacity hover:opacity-90"
            loading="lazy"
          />
        </button>
        {body && !body.startsWith("image") && (
          <p className="mt-1 text-xs text-text-muted">{body}</p>
        )}
      </div>
    );
  }

  // Video message
  if (msgtype === "m.video" && url) {
    const fullUrl = mxcToFullUrl(url, homeserverUrl);
    return (
      <div className="message-content my-1">
        <video
          src={fullUrl ?? undefined}
          controls
          className="max-h-[300px] max-w-[400px] rounded-lg"
          preload="metadata"
        />
      </div>
    );
  }

  // Audio message
  if (msgtype === "m.audio" && url) {
    const fullUrl = mxcToFullUrl(url, homeserverUrl);
    return (
      <div className="message-content my-1">
        <audio src={fullUrl ?? undefined} controls preload="metadata" className="max-w-[400px]" />
      </div>
    );
  }

  // File message
  if (msgtype === "m.file" && url) {
    const fullUrl = mxcToFullUrl(url, homeserverUrl);
    const sizeStr = info?.size ? formatFileSize(info.size) : "";
    return (
      <div className="message-content my-1">
        <a
          href={fullUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          download
          className="flex items-center gap-2 rounded-lg bg-bg-secondary p-3 transition-colors hover:bg-bg-active"
        >
          <svg className="h-8 w-8 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-link">{body}</p>
            {sizeStr && <p className="text-xs text-text-muted">{sizeStr}</p>}
          </div>
          <svg className="h-5 w-5 flex-shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </a>
      </div>
    );
  }

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
            const processed = Array.isArray(children)
              ? children.map((child, i) =>
                  typeof child === "string" ? <span key={i}>{highlightMentions(child, myUserId)}</span> : child
                )
              : typeof children === "string"
                ? highlightMentions(children, myUserId)
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
