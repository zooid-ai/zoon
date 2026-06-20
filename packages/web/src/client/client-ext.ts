import type { MatrixClient } from "matrix-js-sdk";

export interface PublicRoomsChunkRoom {
  room_id: string;
  name?: string;
  topic?: string;
  canonical_alias?: string;
  num_joined_members?: number;
  avatar_url?: string;
  room_type?: string;
}

export interface PublicRoomsResponse {
  chunk: PublicRoomsChunkRoom[];
  next_batch?: string;
  total_room_count_estimate?: number;
}

export interface PublicRoomsQuery {
  filter?: { generic_search_term?: string };
  limit?: number;
  since?: string;
  server?: string;
}

export interface HierarchyResponse {
  rooms: Array<{
    room_id: string;
    name?: string;
    topic?: string;
    num_joined_members?: number;
    room_type?: string;
  }>;
}

/** Methods that are under-typed on MatrixClient in matrix-js-sdk 34. */
interface ClientExt {
  publicRooms(opts: PublicRoomsQuery): Promise<PublicRoomsResponse>;
  getRoomHierarchy(roomId: string): Promise<HierarchyResponse>;
  getRoomIdForAlias(alias: string): Promise<{ room_id: string } | null>;
  joinRoom(idOrAlias: string): Promise<{ roomId: string }>;
}

export function clientExt(client: MatrixClient): ClientExt {
  return client as unknown as ClientExt;
}
