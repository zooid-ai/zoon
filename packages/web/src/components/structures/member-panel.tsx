import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MatrixClientPeg } from "../../client/peg";
import { type MemberRole, groupMembersByRole, useMemberRoles } from "../../hooks/use-member-roles";
import { useMyPowerLevel } from "../../hooks/use-my-power-level";
import { usePendingRoomInvites } from "../../hooks/use-pending-room-invites";
import { InviteUserDialog } from "../dialogs/invite-user";
import { MemberRow } from "./member-row";

interface MemberPanelProps {
  roomId: string;
  spaceId: string | null;
}

// Fixed heights (px) so the list can be virtualized without per-row
// measurement. The rendered rows enforce these exact heights, so there's no
// layout drift between the estimate and the DOM.
const HEADER_HEIGHT = 32;
const ROW_HEIGHT = 40;

type ListItem =
  | { kind: "header"; id: string; label: string }
  | {
      kind: "row";
      id: string;
      userId: string;
      member?: MemberRole;
      membership: "join" | "invite";
    };

export function MemberPanel({ roomId, spaceId }: MemberPanelProps) {
  const members = useMemberRoles(roomId);
  const pending = usePendingRoomInvites(roomId);
  const myPL = useMyPowerLevel(roomId);
  const [inviteOpen, setInviteOpen] = useState(false);

  const room = MatrixClientPeg.safeGet()?.getRoom(roomId);
  const invitePL =
    (room?.currentState.getStateEvents("m.room.power_levels", "")?.getContent() as {
      invite?: number;
    } | null)?.invite ?? 50;
  const canInvite = myPL.level >= invitePL;

  // Flatten the grouped members (and the pending-invite section) into one
  // indexed list of header + row items the virtualizer can window over.
  const items = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];
    if (pending.length > 0) {
      out.push({ kind: "header", id: "header:invited", label: `Invited · ${pending.length}` });
      for (const m of pending) {
        out.push({
          kind: "row",
          id: `invite:${m.userId}`,
          userId: m.userId,
          membership: "invite",
        });
      }
    }
    for (const group of groupMembersByRole(members)) {
      out.push({
        kind: "header",
        id: `header:${group.kind}`,
        label: `${group.label} · ${group.members.length}`,
      });
      for (const m of group.members) {
        out.push({
          kind: "row",
          id: `member:${m.userId}`,
          userId: m.userId,
          member: m,
          membership: "join",
        });
      }
    }
    return out;
  }, [members, pending]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (items[i].kind === "header" ? HEADER_HEIGHT : ROW_HEIGHT),
    getItemKey: (i) => items[i].id,
    overscan: 8,
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {canInvite && spaceId && (
        <div className="p-4 pb-2">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setInviteOpen(true)}>
            Invite
          </Button>
        </div>
      )}
      <div ref={parentRef} className="flex-1 overflow-y-auto px-4 pb-4">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const item = items[vi.index];
            return (
              <div
                key={vi.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: vi.size,
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                {item.kind === "header" ? (
                  <h3 className="flex h-full items-end px-1 pb-1 text-xs font-medium text-muted-foreground">
                    {item.label}
                  </h3>
                ) : (
                  <div className="flex h-full items-center gap-2">
                    <MemberRow
                      roomId={roomId}
                      userId={item.userId}
                      member={item.member}
                      membership={item.membership}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {spaceId && (
        <InviteUserDialog
          open={inviteOpen}
          roomId={roomId}
          spaceId={spaceId}
          onOpenChange={setInviteOpen}
        />
      )}
    </div>
  );
}
