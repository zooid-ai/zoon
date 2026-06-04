import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { injectStateEvent, makeFakeClient, makeRoom, mkMatrixEvent } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useJoinRule } from "./use-join-rule";

const me = "@me:h.example";
const roomId = "!r:h.example";
const spaceId = "!space:h.example";
afterEach(() => MatrixClientPeg.reset());

function setup(content: Record<string, unknown>, spaceName?: string) {
  const client = makeFakeClient({ userId: me });
  const room = makeRoom(roomId, { client, myUserId: me });
  injectStateEvent(
    room,
    mkMatrixEvent({
      roomId,
      sender: "@admin:h.example",
      type: "m.room.join_rules",
      stateKey: "",
      content,
    }),
  );
  const space = makeRoom(spaceId, { client, myUserId: me });
  Object.assign(space as unknown as Record<string, unknown>, { name: spaceName ?? "Acme" });
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = (id) =>
    id === roomId ? room : id === spaceId ? space : null;
  MatrixClientPeg.injectClientForTest(client);
}

describe("useJoinRule", () => {
  it("reads an invite join rule", () => {
    setup({ join_rule: "invite" });
    const { result } = renderHook(() => useJoinRule(roomId));
    expect(result.current.rule).toBe("invite");
    expect(result.current.spaceName).toBeNull();
  });

  it("reads public", () => {
    setup({ join_rule: "public" });
    const { result } = renderHook(() => useJoinRule(roomId));
    expect(result.current.rule).toBe("public");
  });

  it("resolves the backing space name for restricted rooms", () => {
    setup(
      {
        join_rule: "restricted",
        allow: [{ type: "m.room_membership", room_id: spaceId }],
      },
      "Acme",
    );
    const { result } = renderHook(() => useJoinRule(roomId));
    expect(result.current.rule).toBe("restricted");
    expect(result.current.spaceName).toBe("Acme");
  });

  it("defaults to invite when no join_rules state exists", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
    MatrixClientPeg.injectClientForTest(client);
    const { result } = renderHook(() => useJoinRule(roomId));
    expect(result.current.rule).toBe("invite");
  });
});
