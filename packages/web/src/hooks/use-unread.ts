import { NotificationCountType, RoomEvent } from "matrix-js-sdk";
import { useSyncExternalStore } from "react";
import { MatrixClientPeg } from "../client/peg";

export interface UnreadCounts {
  total: number;
  highlight: number;
}

const ZERO: UnreadCounts = { total: 0, highlight: 0 };

const cache = new Map<string, UnreadCounts>();

function snapshot(roomId: string): UnreadCounts {
  const room = MatrixClientPeg.safeGet()?.getRoom(roomId);
  const cached = cache.get(roomId) ?? ZERO;
  if (!room) {
    if (cached !== ZERO) cache.set(roomId, ZERO);
    return ZERO;
  }
  const next: UnreadCounts = {
    total: room.getUnreadNotificationCount(NotificationCountType.Total),
    highlight: room.getUnreadNotificationCount(NotificationCountType.Highlight),
  };
  if (cached.total === next.total && cached.highlight === next.highlight) {
    return cached;
  }
  cache.set(roomId, next);
  return next;
}

export function useUnread(roomId: string): UnreadCounts {
  return useSyncExternalStore(
    (cb) => {
      const client = MatrixClientPeg.safeGet();
      const room = client?.getRoom(roomId);
      if (!room) return MatrixClientPeg.subscribe(cb);
      const onChange = () => cb();
      room.on(RoomEvent.UnreadNotifications, onChange);
      const unsubPeg = MatrixClientPeg.subscribe(cb);
      return () => {
        room.off(RoomEvent.UnreadNotifications, onChange);
        unsubPeg();
      };
    },
    () => snapshot(roomId),
    () => ZERO,
  );
}
