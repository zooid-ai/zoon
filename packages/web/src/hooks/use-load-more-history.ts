import { useCallback, useState } from "react";
import { MatrixClientPeg } from "../client/peg";

interface State {
  loading: boolean;
  hasMore: boolean;
}

/**
 * Backward-paginates the room's live timeline by `limit` events per call.
 * matrix-js-sdk emits Room.timeline for each new event, so consumers using
 * useTimeline / useThread will pick up the additions automatically.
 */
export function useLoadMoreHistory(roomId: string, limit = 50) {
  const [state, setState] = useState<State>({ loading: false, hasMore: true });

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
