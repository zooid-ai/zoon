import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../../app";
import { MatrixClientPeg } from "../../client/peg";
import { relaxUnhandled, stubStartClient, stubSyncWithInvites } from "../../../test/setup";

const HS = "https://hs.example";
const me = "@me:h.example";

// The /invites page boots the real client off a stored session, the same way
// logged-in-view.test.tsx / left-panel.test.tsx do — there is no
// inject-credentials shortcut on the peg.
beforeEach(() => {
  localStorage.setItem(
    "zoon:session",
    JSON.stringify({ homeserverUrl: HS, accessToken: "tok", userId: me, deviceId: "D" }),
  );
  relaxUnhandled();
  stubStartClient(HS);
});
afterEach(() => {
  MatrixClientPeg.reset();
  localStorage.clear();
});

describe("/invites page", () => {
  it("lists pending invites with Accept/Decline and no row cap", async () => {
    // Seed 6 invite rooms via sync so the dedicated page shows all 6
    // (sidebar would cap at 5, the page does not).
    stubSyncWithInvites(
      HS,
      Array.from({ length: 6 }, (_, i) => ({
        roomId: `!r${i}:h.example`,
        name: `Invite ${i}`,
        myUserId: me,
        inviter: "@alice:h.example",
      })),
    );

    render(<App config={{ homeserverUrl: HS }} initialRoute="/invites" />);

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /accept/i }).length).toBe(6),
    );
  });
});
