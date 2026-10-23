import { describe, expect, it, vi } from "vitest";
import { generateIdeas } from "@/ai/ideas";
import { buildPlan } from "@/domain/planner";
import { curatedIdeas } from "@/domain/ideas-fallback";
import { makeBrief, NOW } from "../helpers";

const brief = makeBrief();
const plan = buildPlan(brief, NOW);
const options = { timeoutMs: 50 };
const valid = curatedIdeas(brief, "balanced");

describe("generateIdeas", () => {
  it("returns Gemini's ideas when the reply passes validation", async () => {
    const result = await generateIdeas(brief, plan, async () => JSON.stringify(valid), options);
    expect(result).toEqual({ source: "gemini", ideas: valid });
  });

  it("falls back, with a reason, when no key is configured", async () => {
    const result = await generateIdeas(brief, plan, null, options);
    expect(result).toMatchObject({ source: "curated", notice: "not_configured" });
  });

  it.each([
    ["not JSON", "this is not json", "invalid_response"],
    ["wrong shape", JSON.stringify({ themes: "nope" }), "invalid_response"],
    ["too long", JSON.stringify({ ...valid, menuIdeas: ["x".repeat(999), "b", "c"] }), "invalid_response"],
  ])("falls back when the reply is %s", async (_name, reply, notice) => {
    const result = await generateIdeas(brief, plan, async () => reply, options);
    expect(result).toMatchObject({ source: "curated", notice });
  });

  it("falls back on an upstream error without throwing", async () => {
    const result = await generateIdeas(brief, plan, async () => Promise.reject(new Error("503")), options);
    expect(result).toMatchObject({ source: "curated", notice: "upstream_error" });
  });

  it("aborts a slow model and reports a timeout", async () => {
    const generator = vi.fn(
      (_prompt: string, signal: AbortSignal) => new Promise<string>((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    const result = await generateIdeas(brief, plan, generator, options);
    expect(result).toMatchObject({ source: "curated", notice: "timeout" });
    expect(generator).toHaveBeenCalledOnce();
  });
});
