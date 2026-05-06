import { RoomMemberEvent } from "matrix-js-sdk";
import { useEffect, useState } from "react";
import { MatrixClientPeg } from "../client/peg";

const EMPTY: string[] = [];

function readTyping(roomId: string): string[] {
  const client = MatrixClientPeg.safeGet();
  if (!client) return EMPTY;
  const localUserId = client.getUserId() ?? "";
  const room = client.getRoom(roomId);
  if (!room) return EMPTY;
  const result = room.currentState
    .getMembers()
    .filter((m) => m.typing && m.userId !== localUserId)
    .map((m) => m.userId);
  return result.length === 0 ? EMPTY : result;
}

export function useTyping(roomId: string): string[] {
  const [typing, setTyping] = useState<string[]>(() => readTyping(roomId));

  useEffect(() => {
    const client = MatrixClientPeg.safeGet();
    if (!client) return;

    const update = () => setTyping(readTyping(roomId));
    client.on(RoomMemberEvent.Typing, update);
    return () => { client.off(RoomMemberEvent.Typing, update); };
  }, [roomId]);

  return typing;
}
