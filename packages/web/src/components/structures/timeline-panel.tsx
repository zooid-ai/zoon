import { useEffect, useRef } from "react";
import { useTimeline } from "../../hooks/use-timeline";
import { useLoadMoreHistory } from "../../hooks/use-load-more-history";
import { LoadMoreButton } from "../timeline/load-more-button";
import { MessagePanel } from "./message-panel";

export function TimelinePanel({
  roomId,
  onReplyInThread,
  onViewThread,
}: {
  roomId: string;
  onReplyInThread?: (eventId: string) => void;
  onViewThread?: (eventId: string) => void;
}) {
  const { events, pendingRootIds } = useTimeline(roomId);
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
    <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto">
      <LoadMoreButton loading={loading} hasMore={hasMore} onClick={loadMore} />
      <MessagePanel
        events={events}
        pendingRootIds={pendingRootIds}
        onReplyInThread={onReplyInThread}
        onViewThread={onViewThread}
      />
    </div>
  );
}
