import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { ideasSchema } from "@/domain/schema";
import type { ServerEnv } from "@/server/env";
import { SYSTEM_INSTRUCTION } from "./prompt";

/** Returns the raw JSON text produced by the model. Injected so tests never touch the network. */
export type IdeaGenerator = (prompt: string, signal: AbortSignal) => Promise<string>;

/** JSON Schema sent to Gemini, derived from the same Zod schema that validates the reply. */
function responseJsonSchema(): Record<string, unknown> {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(ideasSchema) as Record<string, unknown>;
  return schema;
}

/**
 * Creates a Gemini-backed generator, or null when no API key is configured.
 * Gemini 3.8 Flash rejects sampling parameters such as temperature, so none are
 * set; thinking is kept low because ideas need speed more than deep reasoning.
 */
export function createGeminiGenerator(env: ServerEnv): IdeaGenerator | null {
  if (!env.GEMINI_API_KEY) return null;
  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const schema = responseJsonSchema();

  return async (prompt, signal) => {
    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
