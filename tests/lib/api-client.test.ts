import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, postJson } from "@/lib/api-client";

const signal = new AbortController().signal;
const respond = (body: BodyInit | null, status: number) => vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));

afterEach(() => vi.unstubAllGlobals());

describe("postJson", () => {
  it("posts JSON and returns the parsed body", async () => {
    respond('{"ok":1}', 200);
    await expect(postJson("/api/plan", { a: 1 }, signal)).resolves.toEqual({ ok: 1 });
    const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/plan");
    expect(init).toMatchObject({ method: "POST", body: '{"a":1}' });
  });

  it("surfaces the server's error code, message and field errors", async () => {
    respond(JSON.stringify({ error: { code: "invalid_brief", message: "Fix it", fields: { budget: "Too big" } } }), 422);
    const error = await postJson("/x", {}, signal).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: "invalid_brief", message: "Fix it", fields: { budget: "Too big" } });
  });

  it("falls back to a generic error when the body is not JSON", async () => {
    respond("<html>502</html>", 502);
    await expect(postJson("/x", {}, signal)).rejects.toMatchObject({ status: 502, code: "unknown", message: "Something went wrong." });
  });
});
