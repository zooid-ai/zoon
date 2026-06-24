import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { makeFakeClient } from "../../../test/factories";
import { MatrixClientPeg } from "../../client/peg";
import { TopicText } from "./topic-text";

const ME = "@me:h.example";

function seedClient() {
  const client = makeFakeClient({ userId: ME });
  const cast = client as unknown as Record<string, unknown>;
  cast.joinRoom = async (id: string) => ({ roomId: id });
  MatrixClientPeg.injectClientForTest(client);
}

const meta = {
  title: "Timeline/TopicText",
  component: TopicText,
  decorators: [
    (Story) => {
      seedClient();
      return (
        <MemoryRouter>
          <div className="max-w-prose p-4">
            <Story />
          </div>
        </MemoryRouter>
      );
    },
  ],
} satisfies Meta<typeof TopicText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlainText: Story = {
  args: { topic: "Ship the daemon. Fast, reliable, composable." },
};

export const WithUrl: Story = {
  args: { topic: "Docs at https://zoon.eco — read before opening issues." },
};

export const WithChannels: Story = {
  args: { topic: "Join #general for chat or #zooid for deep dives." },
};

export const Mixed: Story = {
  args: { topic: "See https://zoon.eco/docs then jump into #general for questions." },
};

export const LongClamped: Story = {
  args: {
    topic:
      "Welcome to the Zooid workspace — your home for human-agent collaboration.\n\nJoin #general to introduce yourself and #zooid to follow development.\n\nCheck https://zoon.eco for the latest docs, roadmap, and release notes.\n\nWe run weekly syncs on Thursdays. Ping @ori if you need access to restricted channels.\n\nGood luck, and ship fast.",
  },
};
