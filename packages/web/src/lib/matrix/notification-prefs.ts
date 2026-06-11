import {
  ClientEvent,
  ConditionKind,
  EventType,
  PushRuleActionName,
  PushRuleKind,
  type IPushRule,
  type MatrixClient,
  type MatrixEvent,
} from "matrix-js-sdk";

export type RoomNotifState = "all" | "mentions" | "mute";
export type GlobalNotifMode = "all" | "mentions";

const MESSAGE_RULE = ".m.rule.message";

// Local-mutation listeners: the SDK emits nothing when *we* write rules, only
// when they arrive over sync, so mutations notify subscribers directly.
const localListeners = new Set<() => void>();

/** Subscribe to any push-rule change: remote (sync account data) or local. */
export function subscribePushRules(client: MatrixClient, cb: () => void): () => void {
  const onAccountData = (ev: MatrixEvent) => {
    if (ev.getType() === EventType.PushRules) cb();
  };
  client.on(ClientEvent.AccountData, onAccountData);
  localListeners.add(cb);
  return () => {
    client.off(ClientEvent.AccountData, onAccountData);
    localListeners.delete(cb);
  };
}

async function refresh(client: MatrixClient): Promise<void> {
  const rules = await client.getPushRules();
  client.setPushRules(rules);
  localListeners.forEach((cb) => cb());
}

function isMuteActions(actions: IPushRule["actions"]): boolean {
  return (
    actions.length === 0 ||
    (actions.includes(PushRuleActionName.DontNotify) &&
      !actions.includes(PushRuleActionName.Notify))
  );
}

function findRoomMuteOverride(client: MatrixClient, roomId: string): IPushRule | undefined {
  return (client.pushRules?.global?.override ?? []).find(
    (r) =>
      r.rule_id === roomId &&
      r.enabled &&
      isMuteActions(r.actions) &&
      r.conditions?.some(
        (c) => c.kind === ConditionKind.EventMatch && c.key === "room_id" && c.pattern === roomId,
      ),
  );
}

function findRoomRule(client: MatrixClient, roomId: string): IPushRule | undefined {
  return (client.pushRules?.global?.room ?? []).find((r) => r.rule_id === roomId);
}

export function getRoomNotifState(client: MatrixClient, roomId: string): RoomNotifState {
  if (findRoomMuteOverride(client, roomId)) return "mute";
  const roomRule = findRoomRule(client, roomId);
  if (roomRule?.enabled && isMuteActions(roomRule.actions)) return "mentions";
  return "all";
}

export async function setRoomNotifState(
  client: MatrixClient,
  roomId: string,
  state: RoomNotifState,
): Promise<void> {
  if (state !== "mute" && findRoomMuteOverride(client, roomId)) {
    await client.deletePushRule("global", PushRuleKind.Override, roomId);
  }
  if (state !== "mentions") {
    await client.setRoomMutePushRule("global", roomId, false);
  }
  if (state === "mentions") {
    await client.setRoomMutePushRule("global", roomId, true);
  } else if (state === "mute" && !findRoomMuteOverride(client, roomId)) {
    await client.addPushRule("global", PushRuleKind.Override, roomId, {
      conditions: [{ kind: ConditionKind.EventMatch, key: "room_id", pattern: roomId }],
      actions: [PushRuleActionName.DontNotify],
    });
  }
  await refresh(client);
}

export function getMutedUsers(client: MatrixClient): string[] {
  return (client.pushRules?.global?.override ?? [])
    .filter(
      (r) =>
        !r.default &&
        r.enabled &&
        isMuteActions(r.actions) &&
        r.conditions?.some(
          (c) => c.kind === ConditionKind.EventMatch && c.key === "sender" && c.pattern === r.rule_id,
        ),
    )
    .map((r) => r.rule_id);
}

export async function setUserMuted(
  client: MatrixClient,
  userId: string,
  muted: boolean,
): Promise<void> {
  if (muted) {
    await client.addPushRule("global", PushRuleKind.Override, userId, {
      conditions: [{ kind: ConditionKind.EventMatch, key: "sender", pattern: userId }],
      actions: [PushRuleActionName.DontNotify],
    });
  } else {
    await client.deletePushRule("global", PushRuleKind.Override, userId);
  }
  await refresh(client);
}

export function getGlobalNotifMode(client: MatrixClient): GlobalNotifMode {
  const rule = (client.pushRules?.global?.underride ?? []).find(
    (r) => r.rule_id === MESSAGE_RULE,
  );
  return rule && !rule.enabled ? "mentions" : "all";
}

export async function setGlobalNotifMode(
  client: MatrixClient,
  mode: GlobalNotifMode,
): Promise<void> {
  await client.setPushRuleEnabled(
    "global",
    PushRuleKind.Underride,
    MESSAGE_RULE,
    mode === "all",
  );
  await refresh(client);
}

export function getKeywords(client: MatrixClient): string[] {
  return (client.pushRules?.global?.content ?? [])
    .filter((r) => !r.default && r.enabled && !isMuteActions(r.actions))
    .map((r) => r.pattern ?? r.rule_id);
}

export async function addKeyword(client: MatrixClient, keyword: string): Promise<void> {
  await client.addPushRule("global", PushRuleKind.ContentSpecific, keyword, {
    pattern: keyword,
    actions: [PushRuleActionName.Notify, { set_tweak: "highlight", value: true } as never],
  });
  await refresh(client);
}

export async function removeKeyword(client: MatrixClient, keyword: string): Promise<void> {
  await client.deletePushRule("global", PushRuleKind.ContentSpecific, keyword);
  await refresh(client);
}
