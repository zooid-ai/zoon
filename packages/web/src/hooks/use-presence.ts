import { useEffect, useState } from "react";
import { MatrixClientPeg } from "../client/peg";
import { subscribeUserPresence } from "./matrix-subscriptions";

export interface PresenceState {
  presence: "online" | "offline" | "unavailable";
  statusMsg: string | null;
}

const OFFLINE: PresenceState = { presence: "offline", statusMsg: null };

function readPresence(userId: string): PresenceState {
  const user = MatrixClientPeg.safeGet()?.getUser(userId);
  if (!user) return OFFLINE;
  return {
    presence: (user.presence as PresenceState["presence"]) ?? "offline",
    statusMsg: user.presenceStatusMsg ?? null,
  };
}

export function usePresence(userId: string): PresenceState {
  const [state, setState] = useState<PresenceState>(() => readPresence(userId));

  useEffect(() => {
    setState(readPresence(userId));
    // Shared, refcounted presence fan-out: one client-level listener serves all
    // rows instead of one per component (which leaks on big member lists).
    return subscribeUserPresence(userId, () => setState(readPresence(userId)));
  }, [userId]);

  return state;
}
