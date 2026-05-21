import { useCallback, useState } from "react";
import { MatrixClientPeg } from "../client/peg";

/**
 * Backward-paginates a single thread's timeline. matrix-js-sdk's Thread keeps
 * its own EventTimelineSet, so paginating the room's main timeline (as
 * useLoadMoreHistory does) is the wrong thing inside a thread — it fetches
 * older parent-room messages, not earlier replies for this thread.
 *
 * `hasMore` is intentionally not tracked here: in ThreadView the authoritative
 * "is there more to load?" signal is `events.length < totalCount` from the
 * server-side bundled relations count, which is already exposed by useThread.
 */
export function useLoadMoreThread(roomId: string, rootEventId: string, limit = 50) {
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading) return;
    const client = MatrixClientPeg.safeGet();
    const room = client?.getRoom(roomId);
    const thread = room?.getThread(rootEventId) ?? null;
    if (!client || !thread) return;
    setLoading(true);
    try {
      await client.paginateEventTimeline(thread.liveTimeline, {
        backwards: true,
        limit,
      });
    } catch (err) {
      console.warn(
        `[useLoadMoreThread] paginate(${roomId}, ${rootEventId}) failed:`,
        err,
      );
    } finally {
      setLoading(false);
    }
  }, [roomId, rootEventId, limit, loading]);

  return { loadMore, loading };
}
