import { UserEvent } from "matrix-js-sdk";
import { useEffect, useState } from "react";
import { MatrixClientPeg } from "../client/peg";

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
    const client = MatrixClientPeg.safeGet();
    if (!client) return;
    const user = client.getUser(userId);
    if (!user) return;

    const update = () => setState(readPresence(userId));
    user.on(UserEvent.Presence, update);
    return () => { user.off(UserEvent.Presence, update); };
  }, [userId]);

  return state;
}
