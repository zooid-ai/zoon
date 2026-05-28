import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MatrixClientPeg } from "../../client/peg";
import { type JoinableRoom, useJoinableRooms } from "../../hooks/use-joinable-rooms";
import type { LoggedInOutletContext } from "./logged-in-view";

/** Route wrapper: resolves the active space from the logged-in Outlet context. */
export function BrowseRoomsRoute() {
  const { spaceId } = useOutletContext<LoggedInOutletContext>();
  if (!spaceId) {
    return <div className="p-6 text-sm text-muted-foreground">No space selected.</div>;
  }
  return <BrowseRooms spaceId={spaceId} />;
}

export function BrowseRooms({ spaceId }: { spaceId: string }) {
  const { rooms, loading, refresh } = useJoinableRooms(spaceId, true);
  const spaceName = MatrixClientPeg.safeGet()?.getRoom(spaceId)?.name;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="font-heading text-lg font-medium">Browse rooms</h1>
        {spaceName && <p className="text-sm text-muted-foreground">{spaceName}</p>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {loading && rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading rooms…</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rooms to join — you're already in all of them.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rooms.map((room) => (
              <RoomRow key={room.roomId} room={room} onJoined={refresh} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RoomRow({ room, onJoined }: { room: JoinableRoom; onJoined: () => void }) {
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const onJoin = async () => {
    const client = MatrixClientPeg.safeGet();
    if (!client) return;
    setJoining(true);
    try {
      await (client as unknown as { joinRoom: (id: string) => Promise<unknown> }).joinRoom(
        room.roomId,
      );
      onJoined();
      navigate(`/room/${room.roomId}`);
    } finally {
      setJoining(false);
    }
  };

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{room.name ?? room.roomId}</p>
        {room.topic && <p className="truncate text-xs text-muted-foreground">{room.topic}</p>}
        <p className="text-xs text-muted-foreground">
          {room.memberCount} member{room.memberCount !== 1 ? "s" : ""}
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={joining} onClick={() => void onJoin()}>
        Join
      </Button>
    </li>
  );
}
