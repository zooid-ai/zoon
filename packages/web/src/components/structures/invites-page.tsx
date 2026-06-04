import { usePendingInvites } from "../../hooks/use-pending-invites";
import { InviteRow } from "./sidebar/invite-row";

export function InvitesPage() {
  const invites = usePendingInvites();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Invites</h1>
      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending invites.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {invites.map((invite) => (
            <InviteRow key={invite.roomId} invite={invite} />
          ))}
        </div>
      )}
    </div>
  );
}
