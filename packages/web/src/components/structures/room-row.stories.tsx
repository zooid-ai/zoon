import type { Meta } from "@storybook/react-vite";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { makeFakeClient } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { setGlobalSearchEnabled } from "../../client/feature-flags";
import { SearchPage } from "./search-page";

const ME = "@me:h.example";

function makeAllRoomsClient(
  chunk: Array<{
    room_id: string;
    name?: string;
    topic?: string;
    num_joined_members: number;
    room_type?: string;
  }>,
  joinedIds: string[] = [],
) {
  const client = makeFakeClient({ userId: ME });
  const cast = client as unknown as Record<string, unknown>;
  cast.getRoom = (id: string) => (joinedIds.includes(id) ? { roomId: id } : null);
  cast.publicRooms = async () => ({ chunk });
  cast.getRoomHierarchy = async () => ({ rooms: [] });
  cast.joinRoom = async (id: string) => ({ roomId: id });
  MatrixClientPeg.injectClientForTest(client);
}

const meta = {
  title: "Structures/RoomRow",
} satisfies Meta;

export default meta;

export const Room = {
  render() {
    setGlobalSearchEnabled(true);
    makeAllRoomsClient([
      { room_id: "!a:h", name: "general", topic: "Town square for discussion", num_joined_members: 42 },
    ]);
    return (
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<SearchPage spaceId={null} />} />
          <Route path="/room/:roomId" element={<span />} />
        </Routes>
      </MemoryRouter>
    );
  },
};

export const Space = {
  render() {
    setGlobalSearchEnabled(true);
    makeAllRoomsClient([
      { room_id: "!s:h", name: "Engineering", topic: "All engineering channels", num_joined_members: 18, room_type: "m.space" },
    ]);
    return (
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<SearchPage spaceId={null} />} />
          <Route path="/room/:roomId" element={<span />} />
        </Routes>
      </MemoryRouter>
    );
  },
};

export const LongTopic = {
  render() {
    setGlobalSearchEnabled(true);
    makeAllRoomsClient([
      {
        room_id: "!a:h",
        name: "very-long-room-name-that-should-truncate-gracefully-in-the-row",
        topic: "This is a really long topic description that should be truncated with an ellipsis when it overflows the available space in the room row component",
        num_joined_members: 99,
      },
    ]);
    return (
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<SearchPage spaceId={null} />} />
          <Route path="/room/:roomId" element={<span />} />
        </Routes>
      </MemoryRouter>
    );
  },
};

export const JoinedAlready = {
  render() {
    setGlobalSearchEnabled(true);
    makeAllRoomsClient(
      [{ room_id: "!j:h", name: "already-joined", num_joined_members: 5 }],
      ["!j:h"],
    );
    return (
      <MemoryRouter initialEntries={["/search"]}>
        <Routes>
          <Route path="/search" element={<SearchPage spaceId={null} />} />
          <Route path="/room/:roomId" element={<span />} />
        </Routes>
      </MemoryRouter>
    );
  },
};
