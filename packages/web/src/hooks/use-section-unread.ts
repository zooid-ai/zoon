import { type Room, NotificationCountType, RoomEvent } from "matrix-js-sdk";
import { useRef, useSyncExternalStore } from "react";
import { MatrixClientPeg } from "../client/peg";

export interface UnreadCounts {
  total: number;
  highlight: number;
}

const ZERO: UnreadCounts = { total: 0, highlight: 0 };

function sumOnce(rooms: Room[]): UnreadCounts {
  let total = 0;
  let highlight = 0;
  for (const r of rooms) {
    total += r.getUnreadNotificationCount(NotificationCountType.Total);
    highlight += r.getUnreadNotificationCount(NotificationCountType.Highlight);
  }
  return { total, highlight };
}

export function useSectionUnread(rooms: Room[]): UnreadCounts {
  // useSyncExternalStore requires getSnapshot to return reference-equal
  // values when nothing has changed; otherwise React enters an update loop.
  // The rooms array is recomputed each render in <Sidebar>, so we can't
  // cache at module level by reference. A per-instance ref suffices.
  const cacheRef = useRef<UnreadCounts>(ZERO);
  return useSyncExternalStore(
    (cb) => {
      const onChange = () => cb();
      for (const r of rooms) r.on(RoomEvent.UnreadNotifications, onChange);
      const unsubPeg = MatrixClientPeg.subscribe(cb);
      return () => {
        for (const r of rooms) r.off(RoomEvent.UnreadNotifications, onChange);
        unsubPeg();
      };
    },
    () => {
      const next = sumOnce(rooms);
      const cached = cacheRef.current;
      if (cached.total === next.total && cached.highlight === next.highlight) {
        return cached;
      }
      const value = next.total === 0 && next.highlight === 0 ? ZERO : next;
      cacheRef.current = value;
      return value;
    },
    () => ZERO,
  );
}
