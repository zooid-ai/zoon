import type { Meta, StoryObj } from "@storybook/react-vite";
import { makeFakeClient, makeRoom, mkMatrixEvent, pushTimelineEvent } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { TimelinePanel } from "./timeline-panel";

const ME = "@me:h.example";
const AGENT = "@architect.acme:h.example";
const ROOM_ID = "!demo:h.example";

function seedPlanRoom() {
  const client = makeFakeClient({ userId: ME });
  const room = makeRoom(ROOM_ID, { client, myUserId: ME });
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = (id: string) =>
    id === ROOM_ID ? room : null;

  pushTimelineEvent(
    room,
    mkMatrixEvent({
      roomId: ROOM_ID,
      sender: ME,
      type: "m.room.message",
      content: { msgtype: "m.text", body: "Hey, can you make a grocery list?" },
    }),
  );
  pushTimelineEvent(
    room,
    mkMatrixEvent({
      roomId: ROOM_ID,
      sender: AGENT,
      type: "eco.zoon.tool_call",
      content: {
        session_id: "s1",
        tool_call_id: "tc1",
        title: "TodoWrite",
        kind: "other",
        raw_input: { todos: [{ content: "Buy bananas", status: "pending" }] },
      },
    }),
  );
  pushTimelineEvent(
    room,
    mkMatrixEvent({
      roomId: ROOM_ID,
      sender: AGENT,
      type: "eco.zoon.plan",
      content: {
        session_id: "s1",
        entries: [
          { content: "Buy bananas", status: "completed" },
          { content: "Buy bread", status: "in_progress" },
          { content: "Buy milk", status: "pending" },
        ],
      },
    }),
  );

  MatrixClientPeg.injectClientForTest(client);
}

function seedToolCallFallbackRoom() {
  const client = makeFakeClient({ userId: ME });
  const room = makeRoom(ROOM_ID, { client, myUserId: ME });
  (client as unknown as { getRoom: (id: string) => unknown }).getRoom = (id: string) =>
    id === ROOM_ID ? room : null;

  pushTimelineEvent(
    room,
    mkMatrixEvent({
      roomId: ROOM_ID,
      sender: ME,
      type: "m.room.message",
      content: { msgtype: "m.text", body: "Make a grocery list." },
    }),
  );
  pushTimelineEvent(
    room,
    mkMatrixEvent({
      roomId: ROOM_ID,
      sender: AGENT,
      type: "eco.zoon.tool_call",
      content: {
        session_id: "s1",
        tool_call_id: "tc2",
        title: "TodoWrite",
        kind: "other",
        raw_input: {
          todos: [
            { content: "Buy bananas", status: "completed" },
            { content: "Buy bread", status: "in_progress" },
            { content: "Buy milk", status: "pending" },
          ],
        },
      },
    }),
  );

  MatrixClientPeg.injectClientForTest(client);
}

const meta = {
  title: "Structures/TimelinePanel (Plan)",
  component: TimelinePanel,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TimelinePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPlanEvent: Story = {
  render: () => {
    seedPlanRoom();
    return <TimelinePanel roomId={ROOM_ID} />;
  },
};

export const WithToolCallFallback: Story = {
  render: () => {
    seedToolCallFallbackRoom();
    return <TimelinePanel roomId={ROOM_ID} />;
  },
};
