/** What the model receives: fixed instructions, and one turn of data. */
export interface IdeaRequest {
  system: string;
  prompt: string;
}

/**
 * The only thing the rest of the app knows about a language model: text in, JSON text out.
 * Dependency inversion: Gemini is one implementation (see gemini.ts); tests inject fakes,
 * and another provider can be swapped in without touching the orchestration or the routes.
 */
export type IdeaGenerator = (request: IdeaRequest, signal: AbortSignal) => Promise<string>;
