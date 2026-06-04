import { Ban, DoorOpen, X } from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "@/components/user-avatar";
import { MatrixClientPeg } from "../../client/peg";
import { useMemberRoles } from "../../hooks/use-member-roles";
import { useMyPowerLevel } from "../../hooks/use-my-power-level";
import { usePresence } from "../../hooks/use-presence";
import { useSetPowerLevel } from "../../hooks/use-set-power-level";
import { useUserName } from "../../hooks/use-user-name";
import { type Role, roleForLevel, roleLabel, standardRoleOptions } from "../../lib/roles";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";

export function MemberRow({
  roomId,
  userId,
  membership = "join",
}: {
  roomId: string;
  userId: string;
  membership?: "join" | "invite";
}) {
  const { presence } = usePresence(userId);
  const name = useUserName(userId, roomId);
  const roles = useMemberRoles(roomId);
  const myPL = useMyPowerLevel(roomId);
  const me = MatrixClientPeg.safeGet()?.getUserId();

  if (membership === "invite") {
    const onCancel = async () => {
      try {
        await MatrixClientPeg.safeGet()?.kick(roomId, userId);
      } catch {
        // Server rejection: the pending list reflects the unchanged state.
      }
    };
    return (
      <>
        <UserAvatar userId={userId} size="sm" presence={presence} />
        <span className="text-sm truncate flex-1">{name}</span>
        {myPL.canKick && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cancel invite"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={() => void onCancel()}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </>
    );
  }

  const entry = roles.find((r) => r.userId === userId);
  const role = entry?.role ?? roleForLevel(0);

  const canEditRoles = myPL.canSendStateEvent("m.room.power_levels");
  // Rule 9: editable only if viewer outranks the target (peers/superiors locked).
  // Self is editable (self-demote) regardless of own level.
  const targetLevel = entry?.powerLevel ?? 0;
  const editable = canEditRoles && (userId === me ? true : targetLevel < myPL.level);
  const isSelf = userId === me;

  return (
    <>
      <UserAvatar userId={userId} size="sm" presence={presence} />
      <span className="text-sm truncate flex-1">{name}</span>
      {editable ? (
        <RoleControl roomId={roomId} userId={userId} role={role} viewerLevel={myPL.level} />
      ) : (
        <span className="text-xs text-muted-foreground">{roleLabel(role)}</span>
      )}
      {!isSelf && (myPL.canKick || myPL.canBan) && (
        <ModerationControls roomId={roomId} userId={userId} canKick={myPL.canKick} canBan={myPL.canBan} />
      )}
    </>
  );
}

function ModerationControls({
  roomId,
  userId,
  canKick,
  canBan,
}: {
  roomId: string;
  userId: string;
  canKick: boolean;
  canBan: boolean;
}) {
  const [dialog, setDialog] = useState<"kick" | "ban" | null>(null);

  const onConfirm = async (reason: string) => {
    const client = MatrixClientPeg.safeGet();
    if (!client) return;
    try {
      if (dialog === "kick") await client.kick(roomId, userId, reason || undefined);
      else if (dialog === "ban") await client.ban(roomId, userId, reason || undefined);
    } catch {
      // Server rejection: membership list reflects the unchanged state.
    }
  };

  return (
    <>
      {canKick && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Kick"
          className="size-6 text-muted-foreground hover:text-destructive"
          onClick={() => setDialog("kick")}
        >
          <DoorOpen className="size-3.5" />
        </Button>
      )}
      {canBan && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ban"
          className="size-6 text-muted-foreground hover:text-destructive"
          onClick={() => setDialog("ban")}
        >
          <Ban className="size-3.5" />
        </Button>
      )}
      <ModerationDialog
        kind={dialog ?? "kick"}
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        onConfirm={onConfirm}
      />
    </>
  );
}

function ModerationDialog({
  kind,
  open,
  onOpenChange,
  onConfirm,
}: {
  kind: "kick" | "ban";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const label = kind === "kick" ? "Kick" : "Ban";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{label} member</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm(reason);
              setReason("");
              onOpenChange(false);
            }}
          >
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleControl({
  roomId,
  userId,
  role,
  viewerLevel,
}: {
  roomId: string;
  userId: string;
  role: Role;
  viewerLevel: number;
}) {
  const { setLevel, resetToDefault } = useSetPowerLevel(roomId);
  const options = standardRoleOptions(viewerLevel);

  const onSelect = async (value: string) => {
    try {
      if (value === "0") await resetToDefault(userId);
      else await setLevel(userId, Number(value));
    } catch {
      // Server/Rule-9 rejection: state hook reflects the unchanged level.
      // (Toast wiring is out of scope for this cut.)
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1 text-xs">
          {roleLabel(role)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={String(role.level)} onValueChange={onSelect}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.kind} value={String(o.level)} disabled={o.disabled}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
          {role.kind === "custom" && (
            // Show the current custom level as a selected, non-standard option
            // so we never force it onto the ladder.
            <DropdownMenuRadioItem value={String(role.level)} disabled>
              {roleLabel(role)}
            </DropdownMenuRadioItem>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
