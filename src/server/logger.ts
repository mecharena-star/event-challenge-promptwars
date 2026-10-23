type Level = "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean>;

/**
 * One JSON object per line on stdout. The `severity` key is the one Google
 * Cloud Logging reads. Callers pass only primitives chosen by the code (codes,
 * counts, durations), never request bodies, so user text and PII cannot leak.
 */
export function log(level: Level, event: string, fields: Fields = {}): void {
  process.stdout.write(`${JSON.stringify({ severity: level.toUpperCase(), event, ...fields })}\n`);
}
