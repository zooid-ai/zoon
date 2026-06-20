import { useCallback, useEffect, useState } from "react";
import { MatrixClientPeg } from "../client/peg";
import { clientExt } from "../client/client-ext";
import { useDebounce } from "./use-debounce";

const PAGE_LIMIT = 20;

export interface PublicRoom {
  roomId: string;
  name?: string;
  topic?: string;
  memberCount: number;
  isSpace: boolean;
  joined: boolean;
}

/**
 * Homeserver-wide public room directory (ZNC023). Debounced search over
 * `publicRooms`; `loadMore()` paginates via the `next_batch` token. Spaces
 * (`room_type === "m.space"`) are returned, flagged, not filtered.
 */
export function usePublicRooms(term: string, server?: string) {
  const debounced = useDebounce(term, 300);
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextBatch, setNextBatch] = useState<string | undefined>(undefined);

  const query = useCallback(
    async (since?: string) => {
      const client = MatrixClientPeg.safeGet();
      if (!client) return;
      setLoading(true);
      setError(null);
      try {
        const res = await clientExt(client).publicRooms({
          filter: { generic_search_term: debounced || undefined },
          limit: PAGE_LIMIT,
          since,
          server,
        });
        const mapped: PublicRoom[] = res.chunk.map((r) => ({
          roomId: r.room_id,
          name: r.name,
          topic: r.topic,
          memberCount: r.num_joined_members ?? 0,
          isSpace: r.room_type === "m.space",
          joined: Boolean(client.getRoom(r.room_id)),
        }));
        setRooms((prev) => (since ? [...prev, ...mapped] : mapped));
        setNextBatch(res.next_batch);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load rooms.");
      } finally {
        setLoading(false);
      }
    },
    [debounced, server],
  );

  useEffect(() => {
    void query(undefined);
  }, [query]);

  const loadMore = useCallback(() => {
    if (nextBatch) void query(nextBatch);
  }, [nextBatch, query]);

  return { rooms, loading, error, hasMore: Boolean(nextBatch), loadMore };
}
