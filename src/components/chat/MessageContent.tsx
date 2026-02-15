import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MessageContentProps {
  body: string;
  formattedBody: string | null;
}

export function MessageContent({ body }: MessageContentProps) {
  return (
    <div className="message-content text-sm text-text-secondary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
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
