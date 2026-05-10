import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UnreadBadge } from "./unread-badge";

describe("<UnreadBadge>", () => {
  it("renders nothing when total is 0", () => {
    const { container } = render(<UnreadBadge total={0} highlight={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the count when total > 0", () => {
    render(<UnreadBadge total={4} highlight={0} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders the count when total > 0 and highlights itself when highlight > 0", () => {
    render(<UnreadBadge total={4} highlight={2} />);
    const badge = screen.getByText("4");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/destructive|red|bg-red/i);
  });

  it("caps display at 99+", () => {
    render(<UnreadBadge total={142} highlight={0} />);
    expect(screen.getByText("99+")).toBeInTheDocument();
  });
});
