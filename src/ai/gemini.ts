import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { ideasSchema } from "@/domain/schema";
import type { ServerEnv } from "@/server/env";
import type { IdeaGenerator } from "./port";

/**
 * Keywords we remove before sending the schema. Gemini's structured-output support is a subset of
 * JSON Schema and has changed between releases; structure (types, required fields, array sizes) is
 * what constrains the shape, and every length and content rule is enforced again on return by Zod.
 */
const UNSUPPORTED_KEYS = new Set(["$schema", "minLength", "maxLength", "pattern", "format"]);

function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupported);
  if (node !== null && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !UNSUPPORTED_KEYS.has(key))
        .map(([key, value]) => [key, stripUnsupported(value)]),
    );
  }
  return node;
}

/** JSON Schema sent to Gemini, derived from the same Zod schema that validates the reply. */
export function responseJsonSchema(): unknown {
  return stripUnsupported(z.toJSONSchema(ideasSchema));
}

/**
 * Creates a Gemini-backed generator, or null when no API key is configured.
 * Gemini 3.8 Flash rejects sampling parameters such as temperature, so none are
 * set; thinking is kept low because ideas need speed more than deep reasoning.
 * The model is given no tools and no way to act: it can only return text.
 */
export function createGeminiGenerator(env: ServerEnv): IdeaGenerator | null {
  if (!env.GEMINI_API_KEY) return null;
  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const schema = responseJsonSchema();

  return async ({ system, prompt }, signal) => {
    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        maxOutputTokens: 1500,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: signal,
      },
    });
    const text = response.text;
    if (!text) throw new Error("empty_response");
    return text;
  };
}
