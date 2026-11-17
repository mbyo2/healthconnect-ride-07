import { describe, it, expect, vi, afterEach } from "vitest";
import { getIceServers, hasTurnConfigured } from "../iceServers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getIceServers", () => {
  it("ships free public STUN only by default — no TURN, no credentials", () => {
    const servers = getIceServers();
    expect(servers.length).toBeGreaterThanOrEqual(2);
    expect(servers.every((s) => String(s.urls).startsWith("stun:"))).toBe(true);
    expect(hasTurnConfigured()).toBe(false);
  });

  it("appends a TURN relay only when all three env vars are set", () => {
    vi.stubEnv("VITE_TURN_URLS", "turns:turn.example.com:5349?transport=tcp");
    vi.stubEnv("VITE_TURN_USERNAME", "user");
    vi.stubEnv("VITE_TURN_CREDENTIAL", "secret");
    const servers = getIceServers();
    expect(servers.some((s) => String(s.urls).includes("turns:"))).toBe(true);
    expect(hasTurnConfigured()).toBe(true);
  });

  it("ignores a TURN URL without credentials (never ships a broken relay)", () => {
    vi.stubEnv("VITE_TURN_URLS", "turn:turn.example.com:3478");
    expect(hasTurnConfigured()).toBe(false);
  });
});
