import { describe, expect, it } from "vitest";
import { mkMatrixEvent } from "../../test/factories";
import {
  ZooidEventType,
  decodeZooidEvent,
  extractToolCallContent,
  isZooidLifecycle,
  isAgentMessageChunk,
  isToolCall,
  isTurnEnd,
  planEntriesFromToolInput,
} from "./zooid-events";


const room = "!r:h.example";
const sender = "@architect.acme:h.example";

describe("extractToolCallContent", () => {
  it("returns legacy string content as text with no diffs", () => {
    expect(extractToolCallContent("hello")).toEqual({ text: "hello", diffs: [] });
  });

  it("extracts text blocks", () => {
    const out = extractToolCallContent([
      { type: "content", content: { type: "text", text: "line one" } },
      { type: "content", content: { type: "text", text: "line two" } },
    ]);
    expect(out).toEqual({ text: "line one\nline two", diffs: [] });
  });

  it("extracts diff blocks (oldText null => empty old side)", () => {
    const out = extractToolCallContent([
      { type: "diff", path: "/abs/new.ts", oldText: null, newText: "export const x = 1\n" },
      { type: "diff", path: "/abs/auth.ts", oldText: "a\n", newText: "b\n" },
    ]);
    expect(out.text).toBeNull();
    expect(out.diffs).toEqual([
      { path: "/abs/new.ts", oldText: "", newText: "export const x = 1\n" },
      { path: "/abs/auth.ts", oldText: "a\n", newText: "b\n" },
    ]);
  });

  it("returns empty for unknown content", () => {
    expect(extractToolCallContent(undefined)).toEqual({ text: null, diffs: [] });
    expect(extractToolCallContent([])).toEqual({ text: null, diffs: [] });
  });
});

describe("decodeZooidEvent", () => {
  it("decodes session.start", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.SessionStart,
      content: { session_id: "s1" },
    });
    expect(decodeZooidEvent(ev)).toEqual({ kind: "session.start", sessionId: "s1" });
  });

  it("decodes turn.start", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.TurnStart,
      content: { session_id: "s1" },
    });
    expect(decodeZooidEvent(ev)).toEqual({ kind: "turn.start", sessionId: "s1" });
  });

  it("decodes agent_message_chunk", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.AgentMessageChunk,
      content: { session_id: "s1", content: "hello" },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "agent_message_chunk",
      sessionId: "s1",
      content: "hello",
    });
  });

  it("decodes tool_call", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.ToolCall,
      content: { session_id: "s1", tool_call_id: "tc1", title: "Bash", kind: "execute" },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "tool_call",
      sessionId: "s1",
      toolCallId: "tc1",
      title: "Bash",
      toolKind: "execute",
    });
  });

  it("decodes tool_call_update", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.ToolCallUpdate,
      content: {
        session_id: "s1",
        tool_call_id: "tc1",
        status: "in_progress",
        content: "running…",
      },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "tool_call_update",
      sessionId: "s1",
      toolCallId: "tc1",
      status: "in_progress",
      content: "running…",
    });
  });

  it("decodes plan", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.Plan,
      content: {
        session_id: "s1",
        entries: [{ content: "do the thing", status: "pending" }],
      },
    });
    expect(decodeZooidEvent(ev)).toMatchObject({
      kind: "plan",
      sessionId: "s1",
      entries: [{ content: "do the thing", status: "pending" }],
    });
  });

  it("decodes turn.end", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.TurnEnd,
      content: { session_id: "s1", stop_reason: "end_turn" },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "turn.end",
      sessionId: "s1",
      stopReason: "end_turn",
    });
  });

  it("returns null for non-eco events", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: "m.room.message",
      content: { msgtype: "m.text", body: "hi" },
    });
    expect(decodeZooidEvent(ev)).toBeNull();
  });

  it("returns null for malformed eco events (missing required field)", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.AgentMessageChunk,
      content: { session_id: "s1" },
    });
    expect(decodeZooidEvent(ev)).toBeNull();
  });

  it("returns null for unknown dev.zooid.* type (forward-compat)", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: "dev.zooid.future_event",
      content: { session_id: "s1" },
    });
    expect(decodeZooidEvent(ev)).toBeNull();
  });
});

describe("decodeZooidEvent — plan (ACP PlanEntry shape)", () => {
  it("decodes entries by content/priority/status (not id/title)", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.Plan,
      content: {
        session_id: "s1",
        entries: [
          { content: "Add bananas", priority: "high", status: "pending" },
          { content: "Add bread", priority: "medium", status: "in_progress" },
        ],
      },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "plan",
      sessionId: "s1",
      entries: [
        { content: "Add bananas", priority: "high", status: "pending" },
        { content: "Add bread", priority: "medium", status: "in_progress" },
      ],
    });
  });

  it("keeps entries even when priority is absent (Claude/Codex don't send it)", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.Plan,
      content: { session_id: "s1", entries: [{ content: "Do thing", status: "completed" }] },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "plan",
      sessionId: "s1",
      entries: [{ content: "Do thing", status: "completed" }],
    });
  });

  it("drops entries missing content or status", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.Plan,
      content: { session_id: "s1", entries: [{ priority: "low" }, { content: "ok", status: "pending" }] },
    });
    const decoded = decodeZooidEvent(ev);
    expect(decoded).toMatchObject({ kind: "plan", entries: [{ content: "ok", status: "pending" }] });
  });
});

describe("planEntriesFromToolInput — fallback for shims that don't emit `plan`", () => {
  it("maps Claude/opencode TodoWrite { todos: [{content, status, priority?}] }", () => {
    expect(
      planEntriesFromToolInput({
        todos: [
          { content: "Add bananas", status: "completed", priority: "high" },
          { content: "Add milk", status: "pending" },
        ],
      }),
    ).toEqual([
      { content: "Add bananas", status: "completed", priority: "high" },
      { content: "Add milk", status: "pending" },
    ]);
  });

  it("maps Codex update_plan { plan: [{step, status}] } (step → content)", () => {
    expect(
      planEntriesFromToolInput({
        explanation: "grocery run",
        plan: [
          { step: "Add bananas", status: "in_progress" },
          { step: "Add bread", status: "pending" },
        ],
      }),
    ).toEqual([
      { content: "Add bananas", status: "in_progress" },
      { content: "Add bread", status: "pending" },
    ]);
  });

  it("returns null for non-planning tool input", () => {
    expect(planEntriesFromToolInput({ command: "ls" })).toBeNull();
    expect(planEntriesFromToolInput(undefined)).toBeNull();
  });
});

describe("type guards", () => {
  it("isZooidLifecycle accepts all 7 lifecycle types", () => {
    const types = [
      ZooidEventType.SessionStart,
      ZooidEventType.TurnStart,
      ZooidEventType.AgentMessageChunk,
      ZooidEventType.ToolCall,
      ZooidEventType.ToolCallUpdate,
      ZooidEventType.Plan,
      ZooidEventType.TurnEnd,
    ];
    for (const t of types) {
      const ev = mkMatrixEvent({ roomId: room, sender, type: t, content: { session_id: "s1" } });
      expect(isZooidLifecycle(ev)).toBe(true);
    }
  });

  it("isZooidLifecycle rejects approval events (those are PLAN-03)", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: "dev.zooid.approval_request",
      content: { approval_id: "a1" },
    });
    expect(isZooidLifecycle(ev)).toBe(false);
  });

  it("isAgentMessageChunk / isToolCall / isTurnEnd narrow correctly", () => {
    const chunk = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.AgentMessageChunk,
      content: { session_id: "s1", content: "x" },
    });
    expect(isAgentMessageChunk(chunk)).toBe(true);
    expect(isToolCall(chunk)).toBe(false);
    expect(isTurnEnd(chunk)).toBe(false);
  });
});

describe("decodeZooidEvent — available_commands_update (ZNC021)", () => {
  it("decodes available_commands_update", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.AvailableCommandsUpdate,
      content: {
        session_id: "s1",
        available_commands: [
          { name: "plan", description: "Switch to plan mode" },
          { name: "compact", description: "Compact the context" },
        ],
      },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "available_commands",
      sessionId: "s1",
      commands: [
        { name: "plan", description: "Switch to plan mode" },
        { name: "compact", description: "Compact the context" },
      ],
    });
  });

  it("drops malformed commands but keeps valid ones", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: ZooidEventType.AvailableCommandsUpdate,
      content: { session_id: "s1", available_commands: [{ description: "no name" }, { name: "ok" }] },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "available_commands",
      sessionId: "s1",
      commands: [{ name: "ok", description: "" }],
    });
  });
});

describe("decodeZooidEvent — error (ZOD055)", () => {
  it("decodes dev.zooid.error with full payload", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: "dev.zooid.error",
      content: {
        session_id: "sess-1",
        turn_id: "turn-1",
        code: "auth_missing",
        message: "Authentication required",
        detail: "claude-agent-acp RequestError",
        transient: false,
        acp_error: { code: -32000, message: "Authentication required" },
        recovery: "https://zooid.dev/docs/guides/run-in-container#auth",
      },
    });
    expect(decodeZooidEvent(ev)).toEqual({
      kind: "error",
      sessionId: "sess-1",
      turnId: "turn-1",
      code: "auth_missing",
      message: "Authentication required",
      detail: "claude-agent-acp RequestError",
      transient: false,
      acpError: { code: -32000, message: "Authentication required" },
      recovery: "https://zooid.dev/docs/guides/run-in-container#auth",
    });
  });

  it("returns null when code missing AND message missing (untyped junk)", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: "dev.zooid.error",
      content: {},
    });
    expect(decodeZooidEvent(ev)).toBeNull();
  });

  it("allows session_id null (pre-turn error) when code+message present", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: "dev.zooid.error",
      content: {
        code: "image_pull_failed",
        message: "pull failed",
        transient: true,
      },
    });
    const decoded = decodeZooidEvent(ev);
    expect(decoded).toMatchObject({ kind: "error", code: "image_pull_failed" });
  });

  it("isZooidLifecycle returns true for dev.zooid.error", () => {
    const ev = mkMatrixEvent({
      roomId: room,
      sender,
      type: "dev.zooid.error",
      content: {},
    });
    expect(isZooidLifecycle(ev)).toBe(true);
  });

  it("ZooidEventType.Error is exported", () => {
    expect(ZooidEventType.Error).toBe("dev.zooid.error");
  });
});
