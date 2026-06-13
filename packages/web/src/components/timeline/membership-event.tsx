import type { MatrixEvent } from "matrix-js-sdk";
import { MatrixClientPeg } from "../../client/peg";
import { UserAvatar } from "../user-avatar";
import { describeMembershipTransition } from "../../lib/matrix/membership-transition";

function localpart(mxid: string): string {
  return mxid.startsWith("@") ? mxid.slice(1).split(":")[0] : mxid;
}

export function MembershipEvent({ event }: { event: MatrixEvent }) {
  const sender = event.getSender() ?? "";
  const roomId = event.getRoomId();
  const resolve = (mxid: string) => {
    const room = roomId ? MatrixClientPeg.safeGet()?.getRoom(roomId) : null;
    return room?.getMember(mxid)?.name || localpart(mxid);
  };
  const content = event.getContent() as { membership?: string; reason?: string };
  const prev = event.getPrevContent() as { membership?: string };
  const line = describeMembershipTransition(
    {
      membership: content.membership,
      prevMembership: prev.membership,
      sender,
      stateKey: event.getStateKey() ?? "",
      reason: content.reason,
    },
    resolve,
  );
  if (!line) return null;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className="shrink-0">
        <UserAvatar userId={sender} size="sm" />
      </div>
      <span className="text-xs text-muted-foreground">{line}</span>
    </div>
  );
}
