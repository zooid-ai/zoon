import { describe, expect, it } from "vitest";
import { listSlashCommands, parseSlashCommand } from "./slash-commands";

describe("parseSlashCommand", () => {
  it("returns null for plain messages", () => {
    expect(parseSlashCommand("hello world")).toBeNull();
  });

  it("returns null for /clear in room mode (no thread context)", () => {
    expect(parseSlashCommand("/clear")).toBeNull();
    expect(parseSlashCommand("/clear", { threadScoped: false })).toBeNull();
  });

  it("parses /clear in thread mode", () => {
    const result = parseSlashCommand("/clear", { threadScoped: true });
    expect(result).not.toBeNull();
    expect(result?.eventType).toBe("dev.zooid.session_reset");
  });

  it("returns null for /new in room mode", () => {
    expect(parseSlashCommand("/new", { threadScoped: false })).toBeNull();
  });

  it("parses /new in thread mode", () => {
    const result = parseSlashCommand("/new", { threadScoped: true });
    expect(result).not.toBeNull();
    expect(result?.eventType).toBe("dev.zooid.session_reset");
  });

  it("returns null for unknown slash commands", () => {
    expect(parseSlashCommand("/unknown")).toBeNull();
    expect(parseSlashCommand("/unknown", { threadScoped: true })).toBeNull();
  });

  it("returns null for /interrupt in room mode", () => {
    expect(parseSlashCommand("/interrupt", { threadScoped: false })).toBeNull();
    expect(parseSlashCommand("/stop", { threadScoped: false })).toBeNull();
  });

  it("parses /interrupt in thread mode", () => {
    const result = parseSlashCommand("/interrupt", { threadScoped: true });
    expect(result?.eventType).toBe("dev.zooid.interrupt");
    expect(result?.content).toEqual({});
  });

  it("parses /stop as an alias for /interrupt", () => {
    const result = parseSlashCommand("/stop", { threadScoped: true });
    expect(result?.eventType).toBe("dev.zooid.interrupt");
  });

  it("captures /interrupt args as a 'reason' field", () => {
    const result = parseSlashCommand("/interrupt wrong file", { threadScoped: true });
    expect(result?.content).toEqual({ reason: "wrong file" });
  });
});

describe("listSlashCommands", () => {
  it("returns /clear and /new only in thread mode", () => {
    const threadCmds = listSlashCommands({ threadScoped: true });
    const names = threadCmds.map((c) => c.name);
    expect(names).toContain("clear");
    expect(names).toContain("new");
  });

  it("does not return /clear or /new in room mode", () => {
    const roomCmds = listSlashCommands({ threadScoped: false });
    const names = roomCmds.map((c) => c.name);
    expect(names).not.toContain("clear");
    expect(names).not.toContain("new");
  });

  it("includes /interrupt in thread mode", () => {
    const names = listSlashCommands({ threadScoped: true }).map((c) => c.name);
    expect(names).toContain("interrupt");
    expect(names).toContain("stop");
  });

  it("returns empty list in room mode (no non-thread commands yet)", () => {
    const cmds = listSlashCommands();
    expect(cmds).toHaveLength(0);
  });

  it("every entry has a non-empty description", () => {
    for (const cmd of listSlashCommands({ threadScoped: true })) {
      expect(cmd.description.length).toBeGreaterThan(0);
    }
  });
});
