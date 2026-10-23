import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/server/rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks with an accurate Retry-After", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => t });
    expect([1, 2, 3].map(() => limiter.check("a").allowed)).toEqual([true, true, true]);
    t = 20_000;
    expect(limiter.check("a")).toEqual({ allowed: false, remaining: 0, retryAfterSec: 40 });
  });

  it("slides: capacity returns as old hits leave the window", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    t = 1001;
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("tracks clients independently and reports what is left", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });
    expect(limiter.check("a").remaining).toBe(1);
    expect(limiter.check("b").remaining).toBe(1);
  });

  it("bounds memory by evicting the least recently seen client", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 2, now: () => 0 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("c"); // evicts "a"
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("c").allowed).toBe(false);
  });
});
