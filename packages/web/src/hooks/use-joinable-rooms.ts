import { useCallback, useEffect, useState } from "react";
import { MatrixClientPeg } from "../client/peg";

export interface JoinableRoom {
  roomId: string;
  name?: string;
  topic?: string;
  memberCount: number;
}

interface Hierarchy {
  rooms: Array<{
    room_id: string;
    name?: string;
    topic?: string;
    num_joined_members?: number;
    room_type?: string;
  }>;
}

/**
 * Rooms in a space that the user is allowed to join but has not joined yet,
 * sourced from the space hierarchy endpoint. Restricted rooms appear here for
 * members who satisfy the allow condition. Only fetches while `enabled`.
 */
export function useJoinableRooms(spaceId: string, enabled: boolean) {
  const [rooms, setRooms] = useState<JoinableRoom[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const client = MatrixClientPeg.safeGet();
    if (!client || !spaceId) return;
    setLoading(true);
    try {
      const res =
        (await (
          client as unknown as { getRoomHierarchy: (id: string) => Promise<Hierarchy> }
        ).getRoomHierarchy(spaceId)) ?? { rooms: [] };
      const joinable = res.rooms
        .filter((r) => r.room_id !== spaceId && r.room_type !== "m.space")
        .filter((r) => !client.getRoom(r.room_id))
        .map((r) => ({
          roomId: r.room_id,
          name: r.name,
          topic: r.topic,
          memberCount: r.num_joined_members ?? 0,
        }));
      setRooms(joinable);
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { rooms, loading, refresh };
}
