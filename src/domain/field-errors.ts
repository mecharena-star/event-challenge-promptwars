import type { ZodError } from "zod";

/** Collapses a Zod error into one user-safe message per field. Shared by the API and the form. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    fields[key] ??= issue.code === "unrecognized_keys" ? "Unknown field" : issue.message;
  }
  return fields;
}
