import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlanBoard } from "./plan-board";

describe("PlanBoard", () => {
  it("renders nothing when there are no entries", () => {
    const { container } = render(<PlanBoard plan={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each entry with its status affordance", () => {
    render(
      <PlanBoard
        plan={{
          sessionId: "s1",
          entries: [
            { content: "Add bananas", status: "completed" },
            { content: "Add bread", status: "in_progress" },
            { content: "Add milk", status: "pending" },
          ],
        }}
      />,
    );
    expect(screen.getByText("Add bananas")).toBeInTheDocument();
    expect(screen.getByText("Add bread")).toBeInTheDocument();
    expect(screen.getByText("Add milk")).toBeInTheDocument();
    // completed entries are visually struck through
    expect(screen.getByText("Add bananas")).toHaveClass("line-through");
    // an in-progress entry is announced for assistive tech
    expect(screen.getByLabelText("in_progress")).toBeInTheDocument();
  });
});
