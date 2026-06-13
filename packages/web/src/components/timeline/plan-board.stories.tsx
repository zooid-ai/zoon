import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlanBoard } from "./plan-board";

const meta = {
  title: "Timeline/PlanBoard",
  component: PlanBoard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PlanBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { plan: null },
};

export const AllPending: Story = {
  args: {
    plan: {
      sessionId: "s1",
      entries: [
        { content: "Buy bananas", status: "pending" },
        { content: "Buy bread", status: "pending" },
        { content: "Buy milk", status: "pending" },
      ],
    },
  },
};

export const Mixed: Story = {
  args: {
    plan: {
      sessionId: "s1",
      entries: [
        { content: "Buy bananas", status: "completed" },
        { content: "Buy bread", status: "in_progress" },
        { content: "Buy milk", status: "pending" },
      ],
    },
  },
};

export const CancelledFailed: Story = {
  args: {
    plan: {
      sessionId: "s1",
      entries: [
        { content: "Run linter", status: "completed" },
        { content: "Run tests", status: "failed" },
        { content: "Deploy", status: "cancelled" },
      ],
    },
  },
};

export const Long: Story = {
  args: {
    plan: {
      sessionId: "s1",
      entries: Array.from({ length: 20 }, (_, i) => ({
        content: `Task ${i + 1}: do the thing number ${i + 1}`,
        status: i < 8 ? "completed" : i === 8 ? "in_progress" : "pending",
      })),
    },
  },
};
