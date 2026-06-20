import type { Decorator, Meta } from "@storybook/react-vite";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { makeFakeClient } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { setGlobalSearchEnabled } from "../../client/feature-flags";
import { SearchPage } from "./search-page";

const ME = "@me:h.example";

function makeClient(opts: {
  publicRooms?: (q: unknown) => Promise<unknown>;
  hierarchy?: () => Promise<unknown>;
}) {
  const client = makeFakeClient({ userId: ME });
  const cast = client as unknown as Record<string, unknown>;
  cast.getRoom = () => null;
  cast.publicRooms = opts.publicRooms ?? (async () => ({ chunk: [] }));
  cast.getRoomHierarchy = opts.hierarchy ?? (async () => ({ rooms: [] }));
  cast.joinRoom = async (id: string) => ({ roomId: id });
  MatrixClientPeg.injectClientForTest(client);
}

const withRouter: Decorator = (Story) => (
  <MemoryRouter initialEntries={["/search"]}>
    <Routes>
      <Route path="/search" element={<Story />} />
      <Route path="/room/:roomId" element={<span data-testid="navigated" />} />
    </Routes>
  </MemoryRouter>
);

const meta = {
  title: "Structures/SearchPage",
  decorators: [withRouter],
} satisfies Meta;

export default meta;

export const FlagOn = {
  render() {
    setGlobalSearchEnabled(true);
    makeClient({
      publicRooms: async () => ({
        chunk: [
          { room_id: "!a:h", name: "Alpha", topic: "A room for alpha topics", num_joined_members: 12 },
          { room_id: "!s:h", name: "Cosmos", num_joined_members: 4, room_type: "m.space" },
          { room_id: "!b:h", name: "Beta", topic: "The beta room", num_joined_members: 7 },
        ],
      }),
    });
    return <SearchPage spaceId="!space:h" />;
  },
};

export const FlagOff = {
  render() {
    setGlobalSearchEnabled(false);
    makeClient({
      hierarchy: async () => ({
        rooms: [
          { room_id: "!r1:h", name: "engineering", topic: "Build stuff", num_joined_members: 5 },
          { room_id: "!r2:h", name: "design", num_joined_members: 3 },
        ],
      }),
    });
    return <SearchPage spaceId="!space:h" />;
  },
};

export const Empty = {
  render() {
    setGlobalSearchEnabled(true);
    makeClient({ publicRooms: async () => ({ chunk: [] }) });
    return <SearchPage spaceId={null} />;
  },
};

export const Loading = {
  render() {
    setGlobalSearchEnabled(true);
    makeClient({
      publicRooms: () => new Promise(() => {}), // never resolves
    });
    return <SearchPage spaceId={null} />;
  },
};
