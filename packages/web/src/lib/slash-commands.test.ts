import { describe, expect, it } from "vitest";
import { listSlashCommands, parseSlashCommand } from "./slash-commands";

describe("parseSlashCommand", () => {
  it("returns null for plain messages", () => {
    expect(parseSlashCommand("hello world")).toBeNull();
  });

  it("parses /clear", () => {
    const result = parseSlashCommand("/clear");
    expect(result).not.toBeNull();
    expect(result?.eventType).toBe("eco.zoon.session_reset");
  });

  it("parses /new", () => {
    const result = parseSlashCommand("/new");
    expect(result).not.toBeNull();
    expect(result?.eventType).toBe("eco.zoon.session_reset");
  });

  it("returns null for unknown slash commands", () => {
    expect(parseSlashCommand("/unknown")).toBeNull();
  });
});

describe("listSlashCommands", () => {
  it("returns at least /clear and /new", () => {
    const cmds = listSlashCommands();
    const names = cmds.map((c) => c.name);
    expect(names).toContain("clear");
    expect(names).toContain("new");
  });

  it("every entry has a non-empty description", () => {
    for (const cmd of listSlashCommands()) {
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });
});
