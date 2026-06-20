import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { mswServer } from "../../test/setup";
import { loadRuntimeConfig } from "./runtime-config";

describe("loadRuntimeConfig", () => {
  it("parses a valid config.json", async () => {
    mswServer.use(
      http.get("/config.json", () =>
        HttpResponse.json({ homeserver_url: "https://h.example", default_idp_label: "Zoon" }),
      ),
    );
    const cfg = await loadRuntimeConfig();
    expect(cfg).toEqual({ homeserver_url: "https://h.example", default_idp_label: "Zoon" });
  });

  it("returns null when /config.json is missing (404)", async () => {
    mswServer.use(http.get("/config.json", () => HttpResponse.json({}, { status: 404 })));
    expect(await loadRuntimeConfig()).toBeNull();
  });

  it("returns null when /config.json is invalid JSON", async () => {
    mswServer.use(http.get("/config.json", () => HttpResponse.text("not json")));
    expect(await loadRuntimeConfig()).toBeNull();
  });

  it("rejects unknown fields silently (forward-compat)", async () => {
    mswServer.use(
      http.get("/config.json", () =>
        HttpResponse.json({ homeserver_url: "https://h.example", future_field: 42 }),
      ),
    );
    const cfg = await loadRuntimeConfig();
    expect(cfg?.homeserver_url).toBe("https://h.example");
  });

  it("parses the global_search opt-out flag", async () => {
    mswServer.use(
      http.get("/config.json", () => HttpResponse.json({ global_search: false })),
    );
    const cfg = await loadRuntimeConfig();
    expect(cfg).toEqual({ global_search: false });
  });

  it("ignores a non-boolean global_search", async () => {
    mswServer.use(
      http.get("/config.json", () => HttpResponse.json({ global_search: "yes" })),
    );
    const cfg = await loadRuntimeConfig();
    expect(cfg).toEqual({});
  });
});
