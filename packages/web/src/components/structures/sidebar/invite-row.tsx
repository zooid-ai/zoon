import { Button } from "@/components/ui/button";
import { MatrixClientPeg } from "../../../client/peg";
import type { PendingInvite } from "../../../hooks/use-pending-invites";

export function InviteRow({ invite }: { invite: PendingInvite }) {
  const accept = () => void MatrixClientPeg.safeGet()?.joinRoom(invite.roomId);
  const decline = () => void MatrixClientPeg.safeGet()?.leave(invite.roomId);

  const displayName = invite.name || invite.roomId;
  const inviterLabel = invite.inviter
    ? invite.inviter.replace(/^@/, "").split(":")[0]
    : "someone";

  return (
    <div className="flex flex-col gap-1 rounded-md px-2 py-1.5 hover:bg-muted">
      <span className="truncate text-sm font-medium">{displayName}</span>
      <span className="truncate text-xs text-muted-foreground">Invited by {inviterLabel}</span>
      <div className="flex gap-1">
        <Button size="sm" className="h-6 px-2 text-xs" onClick={accept}>
          Accept
        </Button>
        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={decline}>
          Decline
        </Button>
      </div>
    </div>
  );
}
