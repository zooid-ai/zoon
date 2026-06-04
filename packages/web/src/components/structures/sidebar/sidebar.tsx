import { Compass, Plus } from "lucide-react";
import { type Room } from "matrix-js-sdk";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDirectRooms } from "../../../hooks/use-direct-rooms";
import { useFavoriteRooms } from "../../../hooks/use-favorite-rooms";
import { useMyPowerLevel } from "../../../hooks/use-my-power-level";
import { useRoomList } from "../../../hooks/use-room-list";
import { useSectionUnread } from "../../../hooks/use-section-unread";
import { useSpaceChildren } from "../../../hooks/use-space-children";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateDmDialog } from "../../dialogs/create-dm";
import { CreateRoomDialog } from "../../dialogs/create-room";
import { InvitesSection } from "./invites-section";
import { RoomRow } from "./room-row";
import type { Scope } from "./scope";
import { Section } from "./section";
import { UnreadBadge } from "./unread-badge";

const ICON_BTN_CLS =
  "inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground";

interface SidebarProps {
  scope: Scope;
  workforceSpaceId: string | null;
}

export function Sidebar({ scope, workforceSpaceId }: SidebarProps) {
  const spaceId = scope.kind === "space" ? scope.spaceId : "";
  const favorites = useFavoriteRooms();
  const dms = useDirectRooms();
  const spaceChildren = useSpaceChildren(spaceId);
  const allRooms = useRoomList();
  const myPL = useMyPowerLevel(spaceId);
  const canCreateRoom = scope.kind === "space" && myPL.canSendStateEvent("m.space.child");
  const canBrowse = scope.kind === "space";
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [createDmOpen, setCreateDmOpen] = useState(false);
  const navigate = useNavigate();

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
  const roomSource =
    scope.kind === "space" ? spaceChildren : allRooms.filter((r) => !r.isSpaceRoom());
  const favList = claim(favorites);
  const dmList = claim(dms);
  const roomList = claim(roomSource);

  const favUnread = useSectionUnread(favList);
  const dmUnread = useSectionUnread(dmList);
  const roomUnread = useSectionUnread(roomList);

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 p-2">
        <InvitesSection />
        <Section
          title="Favorites"
          action={<UnreadBadge total={favUnread.total} highlight={favUnread.highlight} />}
        >
          {favList.map((r) => (
            <RoomRow key={r.roomId} room={r} />
          ))}
        </Section>
        <Section
          title="Rooms"
          action={
            <TooltipProvider>
            <div className="flex items-center gap-1">
              <UnreadBadge total={roomUnread.total} highlight={roomUnread.highlight} />
              {canBrowse ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="browse rooms"
                      onClick={() => navigate("/browse")}
                      className={ICON_BTN_CLS}
                    >
                      <Compass className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Browse rooms</TooltipContent>
                </Tooltip>
              ) : null}
              {canCreateRoom ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="add room"
                      onClick={() => setCreateRoomOpen(true)}
                      className={ICON_BTN_CLS}
                    >
                      <Plus className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Create room</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            </TooltipProvider>
          }
        >
          {roomList.map((r) => (
            <RoomRow key={r.roomId} room={r} />
          ))}
          {canBrowse && roomList.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate("/browse")}
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Browse rooms…
            </button>
          ) : null}
        </Section>
        <Section
          title="DMs"
          defaultExpanded={false}
          action={
            <div className="flex items-center gap-1">
              <UnreadBadge total={dmUnread.total} highlight={dmUnread.highlight} />
              <button
                type="button"
                aria-label="start dm"
                onClick={() => setCreateDmOpen(true)}
                className={ICON_BTN_CLS}
              >
                <Plus className="size-3" />
              </button>
            </div>
          }
        >
          {dmList.map((r) => (
            <RoomRow key={r.roomId} room={r} />
          ))}
        </Section>
      </div>
      {scope.kind === "space" ? (
        <CreateRoomDialog
          open={createRoomOpen}
          spaceId={scope.spaceId}
          onOpenChange={setCreateRoomOpen}
        />
      ) : null}
      {workforceSpaceId ? (
        <CreateDmDialog
          open={createDmOpen}
          spaceId={workforceSpaceId}
          onOpenChange={setCreateDmOpen}
        />
      ) : null}
    </ScrollArea>
  );
}
