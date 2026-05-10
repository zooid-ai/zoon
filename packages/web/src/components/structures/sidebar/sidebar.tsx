import { Plus } from "lucide-react";
import { type Room } from "matrix-js-sdk";
import { useState } from "react";
import { useDirectRooms } from "../../../hooks/use-direct-rooms";
import { useFavoriteRooms } from "../../../hooks/use-favorite-rooms";
import { useMyPowerLevel } from "../../../hooks/use-my-power-level";
import { useSectionUnread } from "../../../hooks/use-section-unread";
import { useSpaceChildren } from "../../../hooks/use-space-children";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateDmDialog } from "../../dialogs/create-dm";
import { CreateRoomDialog } from "../../dialogs/create-room";
import { RoomRow } from "./room-row";
import { Section } from "./section";
import { UnreadBadge } from "./unread-badge";

interface SidebarProps {
  spaceId: string;
}

export function Sidebar({ spaceId }: SidebarProps) {
  const favorites = useFavoriteRooms();
  const dms = useDirectRooms();
  const spaceChildren = useSpaceChildren(spaceId);
  const myPL = useMyPowerLevel(spaceId);
  const canCreateRoom = myPL.canSendStateEvent("m.space.child");
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [createDmOpen, setCreateDmOpen] = useState(false);

  // First-claim ordering: Favorites → DMs → Rooms.
  const claimed = new Set<string>();
  const claim = (rooms: Room[]) => {
    const out: Room[] = [];
    for (const r of rooms) {
      if (claimed.has(r.roomId)) continue;
      claimed.add(r.roomId);
      out.push(r);
    }
    return out;
  };
  const favList = claim(favorites);
  const dmList = claim(dms);
  const roomList = claim(spaceChildren);

  const favUnread = useSectionUnread(favList);
  const dmUnread = useSectionUnread(dmList);
  const roomUnread = useSectionUnread(roomList);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-2">
        <Section
          title="Favorites"
          action={<UnreadBadge total={favUnread.total} highlight={favUnread.highlight} compact />}
        >
          {favList.map((r) => (
            <RoomRow key={r.roomId} room={r} />
          ))}
        </Section>
        <Section
          title="Rooms"
          action={
            <div className="flex items-center gap-1">
              <UnreadBadge total={roomUnread.total} highlight={roomUnread.highlight} compact />
              {canCreateRoom ? (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="add channel"
                  onClick={() => setCreateRoomOpen(true)}
                >
                  <Plus className="size-3" />
                </Button>
              ) : null}
            </div>
          }
        >
          {roomList.map((r) => (
            <RoomRow key={r.roomId} room={r} />
          ))}
        </Section>
        <Section
          title="DMs"
          defaultExpanded={false}
          action={
            <div className="flex items-center gap-1">
              <UnreadBadge total={dmUnread.total} highlight={dmUnread.highlight} compact />
              <Button
                size="sm"
                variant="ghost"
                aria-label="start dm"
                onClick={() => setCreateDmOpen(true)}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          }
        >
          {dmList.map((r) => (
            <RoomRow key={r.roomId} room={r} />
          ))}
        </Section>
      </div>
      <CreateRoomDialog
        open={createRoomOpen}
        spaceId={spaceId}
        onOpenChange={setCreateRoomOpen}
      />
      <CreateDmDialog open={createDmOpen} spaceId={spaceId} onOpenChange={setCreateDmOpen} />
    </ScrollArea>
  );
}
