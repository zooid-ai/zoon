import { act, renderHook } from "@testing-library/react";
import { RoomMember, RoomMemberEvent } from "matrix-js-sdk";
import { afterEach, describe, expect, it } from "vitest";
import { makeFakeClient, makeRoom } from "../../test/factories";
import { MatrixClientPeg } from "../client/peg";
import { useTyping } from "./use-typing";

const me = "@me:h.example";
const agent = "@architect.acme:h.example";
const roomId = "!r:h.example";

afterEach(() => MatrixClientPeg.reset());

describe("useTyping", () => {
  it("returns empty when nobody is typing", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
    (room.currentState as unknown as { getMembers: () => RoomMember[] }).getMembers = () => [];
    MatrixClientPeg.injectClientForTest(client);
    const { result } = renderHook(() => useTyping(roomId));
    expect(result.current).toEqual([]);
  });

  it("returns typing user IDs excluding local user", () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    const agentMember = new RoomMember(roomId, agent);
    const selfMember = new RoomMember(roomId, me);
    agentMember.typing = true;
    selfMember.typing = true;
    (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
    (room.currentState as unknown as { getMembers: () => RoomMember[] }).getMembers = () => [
      agentMember,
      selfMember,
    ];
    MatrixClientPeg.injectClientForTest(client);
    const { result } = renderHook(() => useTyping(roomId));
    expect(result.current).toEqual([agent]);
  });

  it("updates when RoomMemberEvent.Typing fires", async () => {
    const client = makeFakeClient({ userId: me });
    const room = makeRoom(roomId, { client, myUserId: me });
    const agentMember = new RoomMember(roomId, agent);
    (client as unknown as { getRoom: () => unknown }).getRoom = () => room;
    (room.currentState as unknown as { getMembers: () => RoomMember[] }).getMembers = () => [
      agentMember,
    ];
    MatrixClientPeg.injectClientForTest(client);
    const { result } = renderHook(() => useTyping(roomId));
    expect(result.current).toEqual([]);
    act(() => {
      agentMember.typing = true;
      (client as unknown as { emit: (...a: unknown[]) => void }).emit(
        RoomMemberEvent.Typing,
        agentMember,
        room,
      );
    });
    expect(result.current).toEqual([agent]);
  });
});
