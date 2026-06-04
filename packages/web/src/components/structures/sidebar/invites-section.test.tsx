import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { makeFakeClient } from "../../../../test/factories";
import { MatrixClientPeg } from "../../../client/peg";
import { InvitesSection } from "./invites-section";
import type { PendingInvite } from "../../../hooks/use-pending-invites";

const me = "@me:h.example";
afterEach(() => {
  MatrixClientPeg.reset();
  vi.restoreAllMocks();
});

// Drive the section's data through the hook module so we can vary counts.
vi.mock("../../../hooks/use-pending-invites", () => ({
  usePendingInvites: () => mockInvites,
}));
let mockInvites: PendingInvite[] = [];

function inv(n: number): PendingInvite {
  return { roomId: `!r${n}:h.example`, name: `Room ${n}`, inviter: "@a:h.example", ts: n };
}

function renderSection() {
  const client = makeFakeClient({ userId: me });
  Object.assign(client as unknown as Record<string, unknown>, {
    joinRoom: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
  });
  MatrixClientPeg.injectClientForTest(client);
  return render(
    <MemoryRouter>
      <InvitesSection />
    </MemoryRouter>,
  );
}

describe("<InvitesSection>", () => {
  it("renders nothing when there are no invites", () => {
    mockInvites = [];
    const { container } = renderSection();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a badge with the pending count", () => {
    mockInvites = [inv(1), inv(2)];
    renderSection();
    expect(screen.getByLabelText("2 unread")).toBeInTheDocument();
  });

  it("renders all rows when count <= 5", () => {
    mockInvites = [inv(1), inv(2), inv(3)];
    renderSection();
    expect(screen.getAllByRole("button", { name: /accept/i })).toHaveLength(3);
    expect(screen.queryByText(/view all invites/i)).toBeNull();
  });

  it("caps at 5 rows and shows a 'View all invites' link with the full count", () => {
    mockInvites = Array.from({ length: 7 }, (_, i) => inv(i + 1));
    renderSection();
    expect(screen.getAllByRole("button", { name: /accept/i })).toHaveLength(5);
    expect(screen.getByRole("link", { name: /view all invites \(7\)/i })).toHaveAttribute(
      "href",
      "/invites",
    );
    // Badge still shows the true total, not the capped 5.
    expect(screen.getByLabelText("7 unread")).toBeInTheDocument();
  });
});
