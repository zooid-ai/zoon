export interface MembershipChange {
  membership?: string;
  prevMembership?: string;
  sender: string;
  stateKey: string;
  reason?: string;
}

export function describeMembershipTransition(
  c: MembershipChange,
  name: (mxid: string) => string,
): string | null {
  const actor = name(c.sender);
  const target = name(c.stateKey);
  const self = c.sender === c.stateKey;
  const prev = c.prevMembership;
  const m = c.membership;

  let line: string | null = null;
  if (m === "invite") line = `${actor} invited ${target}`;
  else if (m === "join") line = prev === "join" ? null : `${target} joined`;
  else if (m === "ban") line = `${actor} banned ${target}`;
  else if (m === "leave") {
    if (prev === "invite") line = self ? `${target} declined the invitation` : `${actor} cancelled ${target}'s invitation`;
    else if (prev === "ban") line = `${actor} unbanned ${target}`;
    else if (prev === "join") line = self ? `${target} left` : `${actor} removed ${target}`;
  }
  if (!line) return null;
  return c.reason ? `${line} — ${c.reason}` : line;
}
