import { useCallback, useEffect, useState } from "react";
import { Direction, RoomEvent } from "matrix-js-sdk";
import { MatrixClientPeg } from "../client/peg";

interface State {
  loading: boolean;
  hasMore: boolean;
}

function snapshotHasMore(roomId: string): boolean {
  const client = MatrixClientPeg.safeGet();
  const room = client?.getRoom(roomId);
  if (!room) return false;
  // Brand-new rooms don't yet have a back-pagination token, so showing "Load
  // more" at the top of an empty conversation is misleading. Derive from the
  // live timeline's prev_batch instead of optimistically assuming true.
  return room.getLiveTimeline().getPaginationToken(Direction.Backward) !== null;
}

/**
 * Backward-paginates the room's live timeline by `limit` events per call.
 * matrix-js-sdk emits Room.timeline for each new event, so consumers using
 * useTimeline / useThread will pick up the additions automatically.
 */
export function useLoadMoreHistory(roomId: string, limit = 50) {
  const [state, setState] = useState<State>(() => ({
    loading: false,
    hasMore: snapshotHasMore(roomId),
  }));

  // Sync hasMore with the live timeline: when sync delivers a prev_batch we
  // may flip from false → true; after the user paginates to the start we'll
  // flip true → false via the paginate result below.
  useEffect(() => {
    setState((s) => ({ ...s, hasMore: snapshotHasMore(roomId) }));
    const client = MatrixClientPeg.safeGet();
    const room = client?.getRoom(roomId);
    if (!client || !room) return;
    const onTimeline = () => {
      setState((s) => {
        const next = snapshotHasMore(roomId);
        return next === s.hasMore ? s : { ...s, hasMore: next };
      });
    };
    room.on(RoomEvent.Timeline, onTimeline);
    return () => {
      room.off(RoomEvent.Timeline, onTimeline);
    };
  }, [roomId]);

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    const client = MatrixClientPeg.safeGet();
    const room = client?.getRoom(roomId);
    if (!client || !room) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const timeline = room.getLiveTimeline();
      const more = await client.paginateEventTimeline(timeline, {
        backwards: true,
        limit,
      });
      setState({ loading: false, hasMore: more });
    } catch (err) {
      console.warn(`[useLoadMoreHistory] paginate(${roomId}) failed:`, err);
      setState({ loading: false, hasMore: false });
    }
  }, [roomId, limit, state.loading, state.hasMore]);

  return { loadMore, loading: state.loading, hasMore: state.hasMore };
}
