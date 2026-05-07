import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useThread } from "../../hooks/use-timeline";
import { useLoadMoreHistory } from "../../hooks/use-load-more-history";
import { EventTile } from "../timeline/event-tile";
import { LoadMoreButton } from "../timeline/load-more-button";

function MessageSkeleton() {
  return (
    <div className="flex gap-2 py-1.5" aria-busy="true" aria-label="Loading thread parent">
      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-muted animate-pulse" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

export function ThreadView({
  roomId,
  rootEventId,
  onBack,
}: {
  roomId: string;
  rootEventId: string;
  onBack: () => void;
}) {
  const { root, rootPending, events, totalCount } = useThread(roomId, rootEventId);
  const { loadMore, loading, hasMore } = useLoadMoreHistory(roomId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !atBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [events]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to room"
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="text-sm font-medium">
          Thread {totalCount > 0 ? `(${totalCount} ${totalCount === 1 ? "reply" : "replies"})` : ""}
        </span>
      </header>
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto">
        <LoadMoreButton loading={loading} hasMore={hasMore} onClick={loadMore} />
        <ol className="flex flex-col gap-0.5 px-4 py-3">
          <li>
            {root ? (
              <EventTile event={root} disableThreadAffordances />
            ) : rootPending ? (
              <MessageSkeleton />
            ) : (
              <div className="text-sm text-muted-foreground italic py-2">
                Thread root unavailable.
              </div>
            )}
          </li>
          {events.map((ev) => (
            <li key={ev.getId() ?? `${ev.getType()}-${ev.getTs()}`}>
              <EventTile event={ev} disableThreadAffordances />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
