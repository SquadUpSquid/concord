import { useState, useRef, useEffect, useCallback } from "react";
import { getMatrixClient } from "@/lib/matrix";
import { Avatar } from "@/components/common/Avatar";
import { mxcToHttp } from "@/utils/matrixHelpers";

interface SearchResult {
  eventId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  body: string;
  timestamp: number;
}

interface SearchPanelProps {
  roomId: string;
  onClose: () => void;
}

export function SearchPanel({ roomId, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async (term: string) => {
    const client = getMatrixClient();
    if (!client || !term.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const hsUrl = client.getHomeserverUrl();
      const response = await (client as any).searchRoomEvents({
        filter: { rooms: [roomId] },
        search_term: term.trim(),
        order_by: "recent",
      });

      const mapped: SearchResult[] = (response?.results ?? []).map((r: any) => {
        const event = r.result;
        const sender = event?.sender ? client.getUser(event.sender) : null;
        return {
          eventId: event?.event_id ?? "",
          senderId: event?.sender ?? "",
          senderName: sender?.displayName ?? event?.sender ?? "Unknown",
          senderAvatar: sender ? mxcToHttp(sender.avatarUrl, hsUrl) : null,
          body: event?.content?.body ?? "",
          timestamp: event?.origin_server_ts ?? 0,
        };
      });

      setResults(mapped.slice(0, 20));
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(query), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="absolute right-0 top-full z-30 mt-1 w-96 rounded-lg bg-bg-floating shadow-xl">
      <div className="p-3">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search messages..."
          className="w-full rounded-sm bg-bg-input p-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:ring-2 focus:ring-accent"
        />
      </div>
      <div className="max-h-80 overflow-y-auto px-2 pb-2">
        {searching && (
          <p className="py-4 text-center text-xs text-text-muted">Searching...</p>
        )}
        {!searching && hasSearched && results.length === 0 && (
          <p className="py-4 text-center text-xs text-text-muted">No results found</p>
        )}
        {results.map((msg) => (
          <div key={msg.eventId} className="rounded-sm p-3 hover:bg-bg-hover">
            <div className="mb-1 flex items-center gap-2">
              <Avatar name={msg.senderName} url={msg.senderAvatar} size={20} />
              <span className="text-xs font-medium text-text-primary">{msg.senderName}</span>
              <span className="text-[10px] text-text-muted">
                {new Date(msg.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-sm text-text-secondary line-clamp-2">{msg.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
