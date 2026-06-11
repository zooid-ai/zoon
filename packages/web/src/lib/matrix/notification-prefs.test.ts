import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConditionKind,
  PushRuleActionName,
  PushRuleKind,
  type IPushRule,
  type MatrixClient,
} from "matrix-js-sdk";
import { MatrixClientPeg } from "@/client/peg";
import { makeFakeClient } from "../../../test/factories";
import {
  addKeyword,
  getGlobalNotifMode,
  getKeywords,
  getMutedUsers,
  getRoomNotifState,
  removeKeyword,
  setGlobalNotifMode,
  setRoomNotifState,
  setUserMuted,
} from "./notification-prefs";

const roomId = "!r:h.example";
const me = "@me:h.example";
const noisy = "@agent:h.example";

type RuleSeed = Partial<Record<"override" | "content" | "room" | "sender" | "underride", IPushRule[]>>;

export function makePushClient(seed: RuleSeed = {}) {
  const client = makeFakeClient({ userId: me });
  const cast = client as unknown as Record<string, unknown>;
  cast.pushRules = {
    global: {
      override: [],
      content: [],
      room: [],
      sender: [],
      underride: [
        {
          rule_id: ".m.rule.message",
          default: true,
          enabled: true,
          actions: [PushRuleActionName.Notify],
        },
      ],
      ...seed,
    },
  };
  cast.setRoomMutePushRule = vi.fn(async () => {});
  cast.addPushRule = vi.fn(async () => ({}));
  cast.deletePushRule = vi.fn(async () => ({}));
  cast.setPushRuleEnabled = vi.fn(async () => ({}));
  cast.getPushRules = vi.fn(async () => cast.pushRules);
  cast.setPushRules = vi.fn((rules: unknown) => {
    cast.pushRules = rules;
  });
  return client as MatrixClient;
}

function roomMentionsRule(): IPushRule {
  return {
    rule_id: roomId,
    default: false,
    enabled: true,
    actions: [PushRuleActionName.DontNotify],
  };
}

function roomMuteOverride(): IPushRule {
  return {
    rule_id: roomId,
    default: false,
    enabled: true,
    conditions: [{ kind: ConditionKind.EventMatch, key: "room_id", pattern: roomId }],
    actions: [PushRuleActionName.DontNotify],
  };
}

function userMuteOverride(userId: string): IPushRule {
  return {
    rule_id: userId,
    default: false,
    enabled: true,
    conditions: [{ kind: ConditionKind.EventMatch, key: "sender", pattern: userId }],
    actions: [PushRuleActionName.DontNotify],
  };
}

afterEach(() => MatrixClientPeg.reset());

describe("getRoomNotifState", () => {
  it("defaults to all", () => {
    expect(getRoomNotifState(makePushClient(), roomId)).toBe("all");
  });

  it("reads a room-kind dont_notify rule as mentions", () => {
    const client = makePushClient({ room: [roomMentionsRule()] });
    expect(getRoomNotifState(client, roomId)).toBe("mentions");
  });

  it("reads a room_id override rule as mute, even with a room rule present", () => {
    const client = makePushClient({
      override: [roomMuteOverride()],
      room: [roomMentionsRule()],
    });
    expect(getRoomNotifState(client, roomId)).toBe("mute");
  });

  it("ignores user-mute overrides (different rule shape)", () => {
    const client = makePushClient({ override: [userMuteOverride(noisy)] });
    expect(getRoomNotifState(client, roomId)).toBe("all");
  });
});

describe("setRoomNotifState", () => {
  it("mentions: delegates to setRoomMutePushRule(true)", async () => {
    const client = makePushClient();
    await setRoomNotifState(client, roomId, "mentions");
    expect(client.setRoomMutePushRule).toHaveBeenCalledWith("global", roomId, true);
    expect(client.addPushRule).not.toHaveBeenCalled();
  });

  it("mute: adds a room_id override and clears any room rule", async () => {
    const client = makePushClient({ room: [roomMentionsRule()] });
    await setRoomNotifState(client, roomId, "mute");
    expect(client.addPushRule).toHaveBeenCalledWith(
      "global",
      PushRuleKind.Override,
      roomId,
      expect.objectContaining({
        conditions: [{ kind: ConditionKind.EventMatch, key: "room_id", pattern: roomId }],
        actions: [PushRuleActionName.DontNotify],
      }),
    );
    expect(client.setRoomMutePushRule).toHaveBeenCalledWith("global", roomId, false);
  });

  it("all: removes both rule shapes", async () => {
    const client = makePushClient({
      override: [roomMuteOverride()],
      room: [roomMentionsRule()],
    });
    await setRoomNotifState(client, roomId, "all");
    expect(client.deletePushRule).toHaveBeenCalledWith(
      "global",
      PushRuleKind.Override,
      roomId,
    );
    expect(client.setRoomMutePushRule).toHaveBeenCalledWith("global", roomId, false);
  });

  it("refetches push rules after mutating", async () => {
    const client = makePushClient();
    await setRoomNotifState(client, roomId, "mentions");
    expect(client.getPushRules).toHaveBeenCalled();
    expect(client.setPushRules).toHaveBeenCalled();
  });
});

describe("muted users", () => {
  it("lists only sender-condition override mutes", () => {
    const client = makePushClient({
      override: [userMuteOverride(noisy), roomMuteOverride()],
    });
    expect(getMutedUsers(client)).toEqual([noisy]);
  });

  it("mute adds an override rule keyed by user ID", async () => {
    const client = makePushClient();
    await setUserMuted(client, noisy, true);
    expect(client.addPushRule).toHaveBeenCalledWith(
      "global",
      PushRuleKind.Override,
      noisy,
      expect.objectContaining({
        conditions: [{ kind: "event_match", key: "sender", pattern: noisy }],
        actions: [PushRuleActionName.DontNotify],
      }),
    );
  });

  it("unmute deletes the override rule", async () => {
    const client = makePushClient({ override: [userMuteOverride(noisy)] });
    await setUserMuted(client, noisy, false);
    expect(client.deletePushRule).toHaveBeenCalledWith(
      "global",
      PushRuleKind.Override,
      noisy,
    );
  });
});

describe("global mode", () => {
  it("reads enabled .m.rule.message as all", () => {
    expect(getGlobalNotifMode(makePushClient())).toBe("all");
  });

  it("reads disabled .m.rule.message as mentions", () => {
    const client = makePushClient({
      underride: [
        {
          rule_id: ".m.rule.message",
          default: true,
          enabled: false,
          actions: [PushRuleActionName.Notify],
        },
      ],
    });
    expect(getGlobalNotifMode(client)).toBe("mentions");
  });

  it("setGlobalNotifMode toggles the underride rule", async () => {
    const client = makePushClient();
    await setGlobalNotifMode(client, "mentions");
    expect(client.setPushRuleEnabled).toHaveBeenCalledWith(
      "global",
      PushRuleKind.Underride,
      ".m.rule.message",
      false,
    );
  });
});

describe("keywords", () => {
  it("lists non-default content rules", () => {
    const client = makePushClient({
      content: [
        {
          rule_id: "deploy",
          pattern: "deploy",
          default: false,
          enabled: true,
          actions: [PushRuleActionName.Notify],
        },
        {
          rule_id: ".m.rule.contains_user_name",
          pattern: "me",
          default: true,
          enabled: true,
          actions: [PushRuleActionName.Notify],
        },
      ],
    });
    expect(getKeywords(client)).toEqual(["deploy"]);
  });

  it("addKeyword creates a highlighting content rule", async () => {
    const client = makePushClient();
    await addKeyword(client, "deploy");
    expect(client.addPushRule).toHaveBeenCalledWith(
      "global",
      PushRuleKind.ContentSpecific,
      "deploy",
      expect.objectContaining({ pattern: "deploy" }),
    );
  });

  it("removeKeyword deletes the content rule", async () => {
    const client = makePushClient();
    await removeKeyword(client, "deploy");
    expect(client.deletePushRule).toHaveBeenCalledWith(
      "global",
      PushRuleKind.ContentSpecific,
      "deploy",
    );
  });
});
