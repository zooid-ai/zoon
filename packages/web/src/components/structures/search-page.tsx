import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { MatrixClientPeg } from "../../client/peg";
import { clientExt } from "../../client/client-ext";
import { useGlobalSearchEnabled } from "../../client/feature-flags";
import { useJoinableRooms } from "../../hooks/use-joinable-rooms";
import { type PublicRoom, usePublicRooms } from "../../hooks/use-public-rooms";
import { useJoinRoom } from "../../hooks/use-join-room";
import type { LoggedInOutletContext } from "./logged-in-view";

type TabValue = "this-space" | "all";

/** Route wrapper: resolves the active space from the logged-in Outlet context. */
export function SearchPageRoute() {
  const { spaceId } = useOutletContext<LoggedInOutletContext>();
  return <SearchPage spaceId={spaceId} />;
}

export function SearchPage({ spaceId }: { spaceId: string | null }) {
  const globalSearch = useGlobalSearchEnabled();
  const [term, setTerm] = useState("");

  const tabs: { value: TabValue; label: string }[] = [];
  if (spaceId) tabs.push({ value: "this-space", label: "This space" });
  if (globalSearch) tabs.push({ value: "all", label: "All rooms" });

  const [active, setActive] = useState<TabValue>(globalSearch ? "all" : "this-space");
  const activeTab = tabs.some((t) => t.value === active) ? active : (tabs[0]?.value ?? "this-space");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="font-heading text-lg font-medium">Search</h1>
        <Input
          autoFocus
          aria-label="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search rooms…"
          className="mt-2"
        />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <Tabs value={activeTab} onValueChange={(v) => setActive(v as TabValue)} tabs={tabs}>
          {activeTab === "this-space" && spaceId && <ThisSpaceTab spaceId={spaceId} term={term} />}
          {activeTab === "all" && globalSearch && <AllRoomsTab term={term} />}
        </Tabs>
      </div>
    </div>
  );
}

function ThisSpaceTab({ spaceId, term }: { spaceId: string; term: string }) {
  const { rooms, loading, refresh } = useJoinableRooms(spaceId, true);
  const q = term.trim().toLowerCase();
  const filtered = q
    ? rooms.filter(
        (r) =>
          (r.name ?? r.roomId).toLowerCase().includes(q) ||
          (r.topic ?? "").toLowerCase().includes(q),
      )
    : rooms;

  if (loading && rooms.length === 0)
    return <p className="text-sm text-muted-foreground">Loading rooms…</p>;
  if (filtered.length === 0)
    return <p className="text-sm text-muted-foreground">No rooms to join.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {filtered.map((r) => (
        <RoomRow
          key={r.roomId}
          roomId={r.roomId}
          name={r.name}
          topic={r.topic}
          memberCount={r.memberCount}
          onJoined={refresh}
        />
      ))}
    </ul>
  );
}

function AllRoomsTab({ term }: { term: string }) {
  const { rooms, loading, error, hasMore, loadMore } = usePublicRooms(term);
  return (
    <div className="flex flex-col gap-3">
      <JoinByAlias />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {loading && rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">No public rooms found.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rooms.map((r: PublicRoom) => (
            <RoomRow
              key={r.roomId}
              roomId={r.roomId}
              name={r.name}
              topic={r.topic}
              memberCount={r.memberCount}
              isSpace={r.isSpace}
            />
          ))}
        </ul>
      )}
      {hasMore && (
        <Button size="sm" variant="outline" onClick={() => loadMore()}>
          Load more
        </Button>
      )}
    </div>
  );
}

function RoomRow({
  roomId,
  name,
  topic,
  memberCount,
  isSpace = false,
  onJoined,
}: {
  roomId: string;
  name?: string;
  topic?: string;
  memberCount: number;
  isSpace?: boolean;
  onJoined?: () => void;
}) {
  const { joinRoom, joining } = useJoinRoom();
  const [busy, setBusy] = useState(false);

  const onActivate = async () => {
    if (isSpace) {
      // Join the space so it appears in SpaceSwitcher; auto scope-switch is follow-on (ZNC023).
      const client = MatrixClientPeg.safeGet();
      if (!client) return;
      setBusy(true);
      try {
        await clientExt(client).joinRoom(roomId);
      } finally {
        setBusy(false);
      }
      return;
    }
    const joined = await joinRoom(roomId);
    if (joined) onJoined?.();
  };

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name ?? roomId}
          {isSpace && (
            <Badge variant="outline" className="ml-2">
              Space
            </Badge>
          )}
        </p>
        {topic && <p className="truncate text-xs text-muted-foreground">{topic}</p>}
        <p className="text-xs text-muted-foreground">
          {memberCount} member{memberCount !== 1 ? "s" : ""}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={joining || busy}
        onClick={() => void onActivate()}
      >
        {isSpace ? "View" : "Join"}
      </Button>
    </li>
  );
}

/** Join any room by alias (#room:server) or room ID (!id:server). Gated with the All rooms tab. */
function JoinByAlias() {
  const [value, setValue] = useState("");
  const { joinRoom, joining, error } = useJoinRoom();

  const onJoin = async () => {
    const target = value.trim();
    if (!target) return;
    const joined = await joinRoom(target);
    if (joined) setValue("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void onJoin()}
          placeholder="#room:server or !roomid:server"
        />
        <Button size="sm" disabled={joining || !value.trim()} onClick={() => void onJoin()}>
          Join
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
