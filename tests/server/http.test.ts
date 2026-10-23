import { describe, expect, it } from "vitest";
import { clientKey, HttpError, isSameOrigin, MAX_BODY_BYTES, readJsonBody } from "@/server/http";
import { jsonRequest } from "../helpers";

describe("isSameOrigin", () => {
  it.each([
    ["no browser headers (non-browser client)", {}, true],
    ["matching Origin", { origin: "https://jashn.test" }, true],
    ["foreign Origin", { origin: "https://evil.example" }, false],
    ["malformed Origin", { origin: "not a url" }, false],
    ["same-origin fetch metadata", { "sec-fetch-site": "same-origin" }, true],
    ["cross-site fetch metadata", { "sec-fetch-site": "cross-site", origin: "https://jashn.test" }, false],
  ])("%s", (_name, headers, expected) => {
    expect(isSameOrigin(jsonRequest({}, { headers }))).toBe(expected);
  });
});

describe("clientKey", () => {
  it("uses the first forwarded address, then x-real-ip, then a fixed bucket", () => {
    expect(clientKey(jsonRequest({}, { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } }))).toBe("1.2.3.4");
    expect(clientKey(jsonRequest({}, { headers: { "x-real-ip": "5.6.7.8" } }))).toBe("5.6.7.8");
    expect(clientKey(jsonRequest({}))).toBe("unknown");
  });

  it("caps the key length so a header cannot bloat memory", () => {
    expect(clientKey(jsonRequest({}, { headers: { "x-forwarded-for": "a".repeat(500) } }))).toHaveLength(64);
  });
});

describe("readJsonBody", () => {
  const status = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 200;
    } catch (error) {
      return error instanceof HttpError ? error.status : 500;
    }
  };

  it("parses valid JSON", async () => {
    await expect(readJsonBody(jsonRequest({ a: 1 }))).resolves.toEqual({ a: 1 });
  });

  it("rejects the wrong content type with 415", async () => {
    const req = new Request("https://jashn.test/api/plan", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    expect(await status(readJsonBody(req))).toBe(415);
  });

  it("rejects malformed JSON with 400", async () => {
    expect(await status(readJsonBody(jsonRequest("{nope")))).toBe(400);
  });

  it("rejects an oversized declared length without reading the body", async () => {
    const req = jsonRequest({}, { headers: { "content-length": String(MAX_BODY_BYTES + 1) } });
    expect(await status(readJsonBody(req))).toBe(413);
  });

  it("rejects an oversized streamed body even when content-length lies", async () => {
    const big = JSON.stringify({ notes: "x".repeat(MAX_BODY_BYTES + 100) });
    expect(await status(readJsonBody(jsonRequest(big)))).toBe(413);
  });
});
