import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@dicebear/core", () => ({
  createAvatar: vi.fn().mockReturnValue({ toDataUri: () => "data:image/svg+xml,mock" }),
}));
vi.mock("@dicebear/collection", () => ({ glass: {} }));

afterEach(cleanup);

// Import AFTER mocks are registered
let UserAvatar: typeof import("./user-avatar").UserAvatar;
beforeEach(async () => {
  const mod = await import("./user-avatar");
  UserAvatar = mod.UserAvatar;
});

describe("<UserAvatar />", () => {
  it("renders an img with data URI src", () => {
    render(<UserAvatar userId="@architect.acme:h.example" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "data:image/svg+xml,mock");
  });

  it("renders online presence dot", () => {
    render(<UserAvatar userId="@architect.acme:h.example" presence="online" />);
    const dot = document.querySelector("[data-presence]");
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute("data-presence")).toBe("online");
  });

  it("renders no dot when presence is omitted", () => {
    render(<UserAvatar userId="@architect.acme:h.example" />);
    expect(document.querySelector("[data-presence]")).toBeNull();
  });
});
