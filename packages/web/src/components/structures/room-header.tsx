import { ChevronDown, Globe, Lock, Star, Users } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useMatch } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MatrixClientPeg } from "../../client/peg";
import { useJoinRule } from "../../hooks/use-join-rule";
import { useMemberRoles } from "../../hooks/use-member-roles";
import { useMyPowerLevel } from "../../hooks/use-my-power-level";
import { useRoomFavorite } from "../../hooks/use-room-favorite";
import { RenameRoomDialog } from "../dialogs/rename-room";
import { RoomInfoDialog } from "../dialogs/room-info";

const JOIN_RULE_INDICATOR = {
  invite: { Icon: Lock, label: "Invite only" },
  restricted: { Icon: Users, label: "Space members" },
  public: { Icon: Globe, label: "Anyone can join" },
} as const;

interface RoomHeaderProps {
  membersOpen?: boolean;
  onToggleMembers?: () => void;
}

export function RoomHeader({ membersOpen, onToggleMembers }: RoomHeaderProps) {
  const match = useMatch("/room/:roomId");
  const roomId = match?.params.roomId;
  const client = useSyncExternalStore(
    (cb) => MatrixClientPeg.subscribe(cb),
    () => MatrixClientPeg.safeGet(),
    () => null,
  );
  const members = useMemberRoles(roomId ?? "");
  const myPL = useMyPowerLevel(roomId ?? "");
  const { isFavorite, toggle: toggleFavorite } = useRoomFavorite(roomId ?? "");
  const { rule } = useJoinRule(roomId ?? "");
  const [renameOpen, setRenameOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  if (!roomId || !client) return null;

  const room = client.getRoom(roomId);
  const roomName = room?.name ?? roomId;
  const canRename = myPL.canSendStateEvent("m.room.name");
  const { Icon: RuleIcon, label: ruleLabel } = JOIN_RULE_INDICATOR[rule];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Room actions"
            className="h-7 max-w-48 gap-1 truncate px-1.5 text-sm font-medium"
          >
            <span className="truncate">{roomName}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setInfoOpen(true)}>Room Info</DropdownMenuItem>
          {canRename && (
            <DropdownMenuItem onSelect={() => setRenameOpen(true)}>
              Rename room
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setInfoOpen(true)}>Leave room</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              aria-label={ruleLabel}
              className="flex size-5 items-center justify-center text-muted-foreground"
            >
              <RuleIcon className="size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{ruleLabel}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button
        variant="ghost"
        size="icon"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        onClick={() => void toggleFavorite()}
        className="size-6 text-muted-foreground hover:text-foreground"
      >
        <Star
          className={`size-3.5 ${isFavorite ? "fill-current text-amber-500" : ""}`}
        />
      </Button>
      {members.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={membersOpen}
          onClick={onToggleMembers}
          className={`h-6 px-1.5 text-xs ${
            membersOpen
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          {members.length} member{members.length !== 1 ? "s" : ""}
        </Button>
      )}
      <RenameRoomDialog
        open={renameOpen}
        roomId={roomId}
        currentName={roomName}
        onOpenChange={setRenameOpen}
      />
      <RoomInfoDialog open={infoOpen} roomId={roomId} onOpenChange={setInfoOpen} />
    </>
  );
}
