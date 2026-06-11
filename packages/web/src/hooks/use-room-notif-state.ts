import { useCallback, useSyncExternalStore } from "react";
import { MatrixClientPeg } from "@/client/peg";
import {
  getRoomNotifState,
  setRoomNotifState,
  subscribePushRules,
  type RoomNotifState,
} from "@/lib/matrix/notification-prefs";

export function useRoomNotifState(roomId: string): {
  state: RoomNotifState;
  setState: (s: RoomNotifState) => Promise<void>;
} {
  const state = useSyncExternalStore(
    (cb) => {
      const client = MatrixClientPeg.safeGet();
      const unsubPeg = MatrixClientPeg.subscribe(cb);
      if (!client) return unsubPeg;
      const unsubRules = subscribePushRules(client, cb);
      return () => {
        unsubRules();
        unsubPeg();
      };
    },
    () => {
      const client = MatrixClientPeg.safeGet();
      return client ? getRoomNotifState(client, roomId) : "all";
    },
    () => "all" as const,
  );

  const setState = useCallback(
    async (s: RoomNotifState) => {
      const client = MatrixClientPeg.safeGet();
      if (client) await setRoomNotifState(client, roomId, s);
    },
    [roomId],
  );

  return { state, setState };
}
