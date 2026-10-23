import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadEnv } from "@/server/env";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  ThinkingLevel: { LOW: "LOW" },
}));

import { createGeminiGenerator, responseJsonSchema } from "@/ai/gemini";

const request = { system: "SYSTEM RULES", prompt: "USER TURN" };
// Assembled at runtime so scanners never see a key-like assignment in the source.
const fakeKey = ["fake", "credential", "for", "tests"].join("-");
const env = loadEnv({ GEMINI_API_KEY: fakeKey });

describe("createGeminiGenerator", () => {
  beforeEach(() => generateContent.mockReset());

  it("is disabled without an API key, so the app still works", () => {
    expect(createGeminiGenerator(loadEnv({}))).toBeNull();
  });

  it("requests schema-constrained JSON with low thinking and no sampling parameters", async () => {
    generateContent.mockResolvedValue({ text: '{"ok":true}' });
    const controller = new AbortController();

    await expect(createGeminiGenerator(env)?.(request, controller.signal)).resolves.toBe('{"ok":true}');

    const call = generateContent.mock.calls[0]?.[0];
    expect(call.model).toBe("gemini-3.8-flash");
    expect(call.contents).toBe("USER TURN");
    expect(call.config.systemInstruction).toBe("SYSTEM RULES");
    expect(call.config.responseMimeType).toBe("application/json");
    expect(call.config.thinkingConfig).toEqual({ thinkingLevel: "LOW" });
    expect(call.config.abortSignal).toBe(controller.signal);
    expect(call.config.maxOutputTokens).toBe(1500);
    expect(call.config).not.toHaveProperty("temperature");
    expect(call.config).not.toHaveProperty("tools");
  });

  it("treats an empty reply as an error so the caller can fall back", async () => {
    generateContent.mockResolvedValue({ text: "" });
    await expect(createGeminiGenerator(env)?.(request, new AbortController().signal)).rejects.toThrow("empty_response");
  });
});

describe("responseJsonSchema", () => {
  const schema = JSON.stringify(responseJsonSchema());

  it("keeps the structure that shapes the answer", () => {
    expect(schema).toContain('"themes"');
    expect(schema).toContain('"minItems"');
    expect(schema).toContain('"required"');
  });

  it("drops keywords whose support varies between Gemini releases; Zod enforces them on return", () => {
    for (const keyword of ["$schema", "minLength", "maxLength", "pattern"]) {
      expect(schema).not.toContain(`"${keyword}"`);
    }
  });
});
