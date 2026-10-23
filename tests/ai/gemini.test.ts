import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "@/server/env";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  ThinkingLevel: { LOW: "LOW" },
}));

import { createGeminiGenerator } from "@/ai/gemini";

describe("createGeminiGenerator", () => {
  beforeEach(() => generateContent.mockReset());

  it("is disabled without an API key, so the app still works", () => {
    expect(createGeminiGenerator(loadEnv({}))).toBeNull();
  });

  it("requests schema-constrained JSON with low thinking and no sampling parameters", async () => {
    generateContent.mockResolvedValue({ text: '{"ok":true}' });
    const generate = createGeminiGenerator(loadEnv({ GEMINI_API_KEY: ["fake", "credential", "for", "tests"].join("-") }));
    const controller = new AbortController();

    await expect(generate?.("prompt", controller.signal)).resolves.toBe('{"ok":true}');

    const request = generateContent.mock.calls[0]?.[0];
    expect(request.model).toBe("gemini-3.8-flash");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.thinkingConfig).toEqual({ thinkingLevel: "LOW" });
    expect(request.config.abortSignal).toBe(controller.signal);
    expect(request.config).not.toHaveProperty("temperature");
    expect(request.config.responseJsonSchema).not.toHaveProperty("$schema");
    expect(request.config.responseJsonSchema.properties).toHaveProperty("themes");
  });

  it("treats an empty reply as an error so the caller can fall back", async () => {
    generateContent.mockResolvedValue({ text: "" });
    const generate = createGeminiGenerator(loadEnv({ GEMINI_API_KEY: ["fake", "credential", "for", "tests"].join("-") }));
    await expect(generate?.("prompt", new AbortController().signal)).rejects.toThrow("empty_response");
  });
});
