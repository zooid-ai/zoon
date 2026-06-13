import { describe, it, expect } from "vitest";
import { describeMembershipTransition } from "./membership-transition";

const name = (id: string) => id.slice(1).split(":")[0];

describe("describeMembershipTransition", () => {
  it("invite", () =>
    expect(
      describeMembershipTransition(
        { membership: "invite", sender: "@bob:h", stateKey: "@carol:h" },
        name,
      ),
    ).toBe("bob invited carol"));

  it("join", () =>
    expect(
      describeMembershipTransition(
        { membership: "join", prevMembership: "invite", sender: "@carol:h", stateKey: "@carol:h" },
        name,
      ),
    ).toBe("carol joined"));

  it("declined invitation (self, invite→leave)", () =>
    expect(
      describeMembershipTransition(
        { membership: "leave", prevMembership: "invite", sender: "@carol:h", stateKey: "@carol:h" },
        name,
      ),
    ).toBe("carol declined the invitation"));

  it("cancelled invitation (other, invite→leave)", () =>
    expect(
      describeMembershipTransition(
        { membership: "leave", prevMembership: "invite", sender: "@bob:h", stateKey: "@carol:h" },
        name,
      ),
    ).toBe("bob cancelled carol's invitation"));

  it("left (self, join→leave)", () =>
    expect(
      describeMembershipTransition(
        { membership: "leave", prevMembership: "join", sender: "@carol:h", stateKey: "@carol:h" },
        name,
      ),
    ).toBe("carol left"));

  it("removed with reason (other, join→leave)", () =>
    expect(
      describeMembershipTransition(
        {
          membership: "leave",
          prevMembership: "join",
          sender: "@bob:h",
          stateKey: "@carol:h",
          reason: "spam",
        },
        name,
      ),
    ).toBe("bob removed carol — spam"));

  it("banned", () =>
    expect(
      describeMembershipTransition(
        { membership: "ban", sender: "@bob:h", stateKey: "@carol:h" },
        name,
      ),
    ).toBe("bob banned carol"));

  it("unbanned (ban→leave)", () =>
    expect(
      describeMembershipTransition(
        { membership: "leave", prevMembership: "ban", sender: "@bob:h", stateKey: "@carol:h" },
        name,
      ),
    ).toBe("bob unbanned carol"));

  it("profile-only change (join→join) renders nothing", () =>
    expect(
      describeMembershipTransition(
        { membership: "join", prevMembership: "join", sender: "@carol:h", stateKey: "@carol:h" },
        name,
      ),
    ).toBeNull());
});
