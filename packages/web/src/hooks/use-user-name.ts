import { RoomStateEvent } from "matrix-js-sdk";
import { useSyncExternalStore } from "react";
import { MatrixClientPeg } from "../client/peg";
import { displayNameOf, nameOfMember } from "../lib/sender";
import { subscribeRoomState, subscribeUserDisplayName } from "./matrix-subscriptions";

function snapshot(userId: string, roomId?: string): string {
  const client = MatrixClientPeg.safeGet();
  if (!client) return displayNameOf(userId);
  if (roomId) {
    const room = client.getRoom(roomId);
    const member = room?.getMember(userId);
    if (member) return nameOfMember(member);
  }
  const user = client.getUser(userId);
  if (user?.displayName) return user.displayName;
  return displayNameOf(userId);
}

/**
 * Resolve a user's visible name, scoped to a room when one is provided.
 * Subscribes to relevant member / profile events so the rendered name
 * updates if it changes mid-session.
 */
export function useUserName(userId: string, roomId?: string): string {
  return useSyncExternalStore(
    (cb) => {
      const unsubUser = subscribeUserDisplayName(userId, cb);
      const unsubRoom = roomId
        ? subscribeRoomState(roomId, [RoomStateEvent.Members], cb)
        : null;
      return () => {
        unsubUser();
        unsubRoom?.();
      };
    },
    () => snapshot(userId, roomId),
    () => displayNameOf(userId),
  );
}
