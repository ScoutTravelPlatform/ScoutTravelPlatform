import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("VGS server authentication", () => {
  it("refuses to run outside the sandbox", async () => {
    process.env.NEXT_PUBLIC_VGS_ENVIRONMENT = "live";
    process.env.VGS_CLIENT_ID = "client";
    process.env.VGS_CLIENT_SECRET = "secret";
    const { getVgsServerEnv } = await import("./server");
    expect(() => getVgsServerEnv()).toThrow("restricted to the sandbox");
  });

  it("returns only the short-lived access token from VGS", async () => {
    process.env.NEXT_PUBLIC_VGS_ENVIRONMENT = "sandbox";
    process.env.VGS_CLIENT_ID = "client";
    process.env.VGS_CLIENT_SECRET = "secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "short-lived-token", expires_in: 300 }),
    }));
    const { createVgsCollectAccessToken } = await import("./server");
    await expect(createVgsCollectAccessToken()).resolves.toBe("short-lived-token");
  });
});
