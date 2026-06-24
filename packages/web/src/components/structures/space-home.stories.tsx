import type { Meta } from "@storybook/react-vite";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { injectStateEvent, makeFakeClient, makeRoom, mkMatrixEvent } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { SpaceHome } from "./space-home";

const ME = "@me:h.example";
const SPACE_ID = "!space:h.example";

function seedSpace(topic?: string) {
  const client = makeFakeClient({ userId: ME });
  const space = makeRoom(SPACE_ID, { client, myUserId: ME });
  Object.assign(space as unknown as Record<string, unknown>, { name: "Acme", isSpaceRoom: () => true });
  if (topic) {
    injectStateEvent(
      space,
      mkMatrixEvent({
        roomId: SPACE_ID,
        sender: "@creator:h.example",
        type: "m.room.topic",
        stateKey: "",
        content: { topic },
      }),
    );
  }
  const cast = client as unknown as Record<string, unknown>;
  cast.getRoom = (id: string) => (id === SPACE_ID ? space : null);
  cast.joinRoom = async (id: string) => ({ roomId: id });
  cast.getJoinedRooms = () => [];
  MatrixClientPeg.injectClientForTest(client);
}

const meta = {
  title: "Structures/SpaceHome",
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Story />} />
          <Route path="/search" element={<div className="p-6 text-muted-foreground">Search page</div>} />
        </Routes>
      </MemoryRouter>
    ),
  ],
} satisfies Meta;

export default meta;

export const WithTopicAndChannels = {
  render() {
    seedSpace(
      "Welcome to Acme — your AI-first workspace.\n\nJoin #general to meet the team and #zooid for agent development. See https://zoon.eco for docs.",
    );
    return <SpaceHome spaceId={SPACE_ID} />;
  },
};

export const NoTopic = {
  render() {
    seedSpace();
    return <SpaceHome spaceId={SPACE_ID} />;
  },
};
