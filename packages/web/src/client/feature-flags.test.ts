import { afterEach, describe, expect, it } from "vitest";
import {
  resolveGlobalSearch,
  setGlobalSearchEnabled,
  isGlobalSearchEnabled,
} from "./feature-flags";

afterEach(() => setGlobalSearchEnabled(true)); // restore default singleton

describe("resolveGlobalSearch", () => {
  it("defaults to enabled when neither runtime nor build-time is set", () => {
    expect(resolveGlobalSearch({})).toBe(true);
  });

  it("uses the runtime value when present (opt-out)", () => {
    expect(resolveGlobalSearch({ runtime: false })).toBe(false);
    expect(resolveGlobalSearch({ runtime: true })).toBe(true);
  });

  it("runtime wins over build-time", () => {
    expect(resolveGlobalSearch({ runtime: false, buildtime: "true" })).toBe(false);
  });

  it("parses the build-time string flag", () => {
    expect(resolveGlobalSearch({ buildtime: "false" })).toBe(false);
    expect(resolveGlobalSearch({ buildtime: "FALSE" })).toBe(false);
    expect(resolveGlobalSearch({ buildtime: "true" })).toBe(true);
    expect(resolveGlobalSearch({ buildtime: "" })).toBe(true); // unset-ish → default on
  });
});

describe("global-search singleton", () => {
  it("round-trips through the setter/getter", () => {
    setGlobalSearchEnabled(false);
    expect(isGlobalSearchEnabled()).toBe(false);
    setGlobalSearchEnabled(true);
    expect(isGlobalSearchEnabled()).toBe(true);
  });
});
