import { type MatrixClient, type RoomStateEvent, type User, UserEvent } from "matrix-js-sdk";
import { MatrixClientPeg } from "../client/peg";

/**
 * Shared, refcounted fan-out for the matrix events that React name/role/power
 * hooks subscribe to. Without it, every component instance attaches its own
 * listener to the same `User` / room-state object — so a busy room piles up
 * hundreds of duplicate listeners (and trips matrix-js-sdk's EventEmitter leak
 * warning at 10). Here each distinct (user displayname) or (room, state-event
 * kind) gets exactly one underlying matrix listener; React subscribers share it.
 */

type Listener = () => void;
type Attach = (key: string, bucket: Bucket, client: MatrixClient | null) => void;

interface Bucket {
  listeners: Set<Listener>;
  /** Detaches the underlying matrix listener; null when nothing is attached. */
  detach: (() => void) | null;
}

const registries: { map: Map<string, Bucket>; attach: Attach }[] = [];
let pegUnsub: (() => void) | null = null;

function notify(bucket: Bucket): void {
  for (const l of bucket.listeners) l();
}

function makeRegistry(attach: Attach): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  registries.push({ map, attach });
  return map;
}

function reattachAll(map: Map<string, Bucket>, attach: Attach, client: MatrixClient | null): void {
  for (const [key, bucket] of map) {
    bucket.detach?.();
    bucket.detach = null;
    attach(key, bucket, client);
    notify(bucket);
  }
}

/** Re-bind every bucket to the new client whenever the peg swaps it out. */
function ensurePeg(): void {
  if (pegUnsub) return;
  pegUnsub = MatrixClientPeg.subscribe(() => {
    const client = MatrixClientPeg.safeGet();
    for (const { map, attach } of registries) reattachAll(map, attach, client);
    syncClientPresence(client);
  });
}

function teardownPegIfIdle(): void {
  if (pegUnsub && registries.every((r) => r.map.size === 0)) {
    pegUnsub();
    pegUnsub = null;
  }
}

function addTo(map: Map<string, Bucket>, key: string, cb: Listener, attach: Attach): () => void {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = { listeners: new Set(), detach: null };
    map.set(key, bucket);
    attach(key, bucket, MatrixClientPeg.safeGet());
  }
  bucket.listeners.add(cb);
  return () => {
    const b = map.get(key);
    if (!b) return;
    b.listeners.delete(cb);
    if (b.listeners.size === 0) {
      b.detach?.();
      map.delete(key);
    }
  };
}

const attachUser: Attach = (userId, bucket, client) => {
  const user = client?.getUser(userId) ?? null;
  if (!user) return;
  const handler = () => notify(bucket);
  user.on(UserEvent.DisplayName, handler);
  bucket.detach = () => user.off(UserEvent.DisplayName, handler);
};
const userMap = makeRegistry(attachUser);

// Room-state buckets are keyed by `${roomId} ${kind}` so each (room, event
// kind) pair gets its own bucket and underlying listener. Neither matrix room
// IDs nor RoomStateEvent values contain a space, so it's a safe separator.
const SEP = " ";
const attachRoomState: Attach = (key, bucket, client) => {
  const sep = key.indexOf(SEP);
  const roomId = key.slice(0, sep);
  const kind = key.slice(sep + 1) as RoomStateEvent;
  const room = client?.getRoom(roomId) ?? null;
  if (!room) return;
  const handler = () => notify(bucket);
  room.currentState.on(kind, handler);
  bucket.detach = () => room.currentState.off(kind, handler);
};
const roomStateMap = makeRegistry(attachRoomState);

// Presence. The SDK re-emits UserEvent.Presence at the *client* level for every
// user, so one shared client listener fans out to all per-user buckets — instead
// of one client listener per subscribing component (which leaks at scale). We
// also attach to the specific User object when it exists, covering clients that
// only emit on the User.
const attachPresenceUser: Attach = (userId, bucket, client) => {
  const user = client?.getUser(userId) ?? null;
  if (!user) return;
  const handler = () => notify(bucket);
  user.on(UserEvent.Presence, handler);
  bucket.detach = () => user.off(UserEvent.Presence, handler);
};
const presenceMap = makeRegistry(attachPresenceUser);

let clientPresenceDetach: (() => void) | null = null;
function syncClientPresence(client: MatrixClient | null): void {
  clientPresenceDetach?.();
  clientPresenceDetach = null;
  if (presenceMap.size === 0 || !client) return;
  const handler = (_event: unknown, user: User) => {
    const bucket = presenceMap.get(user.userId);
    if (bucket) notify(bucket);
  };
  client.on(UserEvent.Presence, handler);
  clientPresenceDetach = () => client.off(UserEvent.Presence, handler);
}

/** Subscribe to a user's presence (online/offline/unavailable) changes. */
export function subscribeUserPresence(userId: string, cb: Listener): () => void {
  ensurePeg();
  const unsub = addTo(presenceMap, userId, cb, attachPresenceUser);
  if (!clientPresenceDetach) syncClientPresence(MatrixClientPeg.safeGet());
  return () => {
    unsub();
    if (presenceMap.size === 0) syncClientPresence(null);
    teardownPegIfIdle();
  };
}

/** Subscribe to a user's profile displayname changes. */
export function subscribeUserDisplayName(userId: string, cb: Listener): () => void {
  ensurePeg();
  const unsub = addTo(userMap, userId, cb, attachUser);
  return () => {
    unsub();
    teardownPegIfIdle();
  };
}

/** Subscribe to one or more room-state event kinds for a room. */
export function subscribeRoomState(
  roomId: string,
  kinds: RoomStateEvent[],
  cb: Listener,
): () => void {
  ensurePeg();
  const unsubs = kinds.map((kind) =>
    addTo(roomStateMap, `${roomId}${SEP}${kind}`, cb, attachRoomState),
  );
  return () => {
    for (const u of unsubs) u();
    teardownPegIfIdle();
  };
}
