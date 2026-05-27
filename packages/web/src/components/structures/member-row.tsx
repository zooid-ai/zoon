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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export function MemberRow({ roomId, userId }: { roomId: string; userId: string }) {
  const { presence } = usePresence(userId);
  const name = useUserName(userId, roomId);
  const roles = useMemberRoles(roomId);
  const myPL = useMyPowerLevel(roomId);
  const me = MatrixClientPeg.safeGet()?.getUserId();

  const entry = roles.find((r) => r.userId === userId);
  const role = entry?.role ?? roleForLevel(0);

  const canEditRoles = myPL.canSendStateEvent("m.room.power_levels");
  // Rule 9: editable only if viewer outranks the target (peers/superiors locked).
  // Self is editable (self-demote) regardless of own level.
  const targetLevel = entry?.powerLevel ?? 0;
  const editable = canEditRoles && (userId === me ? true : targetLevel < myPL.level);

  return (
    <>
      <UserAvatar userId={userId} size="sm" presence={presence} />
      <span className="text-sm truncate flex-1">{name}</span>
      {editable ? (
        <RoleControl roomId={roomId} userId={userId} role={role} viewerLevel={myPL.level} />
      ) : (
        <span className="text-xs text-muted-foreground">{roleLabel(role)}</span>
      )}
    </>
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
