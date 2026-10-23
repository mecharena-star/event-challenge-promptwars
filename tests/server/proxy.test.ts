import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const run = () => proxy(new NextRequest("https://jashn.test/"));
const csp = (response: Response) => response.headers.get("content-security-policy") ?? "";
const nonceOf = (policy: string) => /'nonce-([^']+)'/.exec(policy)?.[1];

describe("proxy (security headers)", () => {
  it("issues a fresh, unguessable nonce for every request", () => {
    const [a, b] = [nonceOf(csp(run())), nonceOf(csp(run()))];
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
    expect(String(a).length).toBeGreaterThanOrEqual(24);
  });

  it("allows only our own scripts and styles, with no unsafe escape hatches", () => {
    const policy = csp(run());
    expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(policy).toMatch(/style-src 'self' 'nonce-[^']+'/);
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("blocks framing, plugins, base-tag hijacking and off-site connections", () => {
    const policy = csp(run());
    for (const directive of [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "connect-src 'self'",
      "upgrade-insecure-requests",
    ]) {
      expect(policy).toContain(directive);
    }
  });

  it("sets the hardening headers on every response", () => {
    const { headers } = run();
    expect(headers.get("strict-transport-security")).toContain("max-age=63072000");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("permissions-policy")).toContain("camera=()");
    expect(headers.get("cross-origin-opener-policy")).toBe("same-origin");
  });

  it("skips static assets but covers pages and API routes", () => {
    const matcher = new RegExp(`^${config.matcher.replace(/^\//, "\\/")}$`);
    expect(matcher.test("/")).toBe(true);
    expect(matcher.test("/api/plan")).toBe(true);
    expect(matcher.test("/_next/static/chunks/app.js")).toBe(false);
  });
});
