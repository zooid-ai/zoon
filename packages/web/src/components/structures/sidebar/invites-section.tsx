import { Link } from "react-router-dom";
import { usePendingInvites } from "../../../hooks/use-pending-invites";
import { Section } from "./section";
import { UnreadBadge } from "./unread-badge";
import { InviteRow } from "./invite-row";

const MAX_ROWS = 5;

export function InvitesSection() {
  const invites = usePendingInvites();
  if (invites.length === 0) return null;

  const visible = invites.slice(0, MAX_ROWS);
  const overflow = invites.length - visible.length;

  return (
    <Section title="Invites" action={<UnreadBadge total={invites.length} highlight={0} />}>
      {visible.map((invite) => (
        <InviteRow key={invite.roomId} invite={invite} />
      ))}
      {overflow > 0 && (
        <Link
          to="/invites"
          className="block px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          View all invites ({invites.length})
        </Link>
      )}
    </Section>
  );
}
