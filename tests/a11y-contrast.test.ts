import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

/** Extracts `--name: #hex` pairs from the first :root block after `marker`. */
function tokens(marker: string): Record<string, string> {
  const start = marker === "" ? css.indexOf(":root") : css.indexOf(marker);
  const block = css.slice(css.indexOf(":root", start), css.indexOf("}", css.indexOf(":root", start)));
  return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ["ink", "bg"], ["ink", "surface"], ["muted", "bg"], ["muted", "surface"],
  ["brand", "bg"], ["brand", "surface"], ["on-brand", "brand"],
  ["on-accent", "accent"], ["danger", "bg"], ["danger", "surface"],
];
const UI_PAIRS: [string, string][] = [["focus", "bg"], ["focus", "surface"], ["brand", "bg"]];

describe.each([
  ["light", ""],
  ["dark", "prefers-color-scheme: dark"],
])("%s theme colour contrast (WCAG 2.2 AA)", (_name, marker) => {
  const t = tokens(marker);

  it.each(TEXT_PAIRS)("text %s on %s is at least 4.5:1", (fg, bg) => {
    expect(contrast(t[fg] as string, t[bg] as string)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)("focus ring and control borders %s on %s are at least 3:1", (fg, bg) => {
    expect(contrast(t[fg] as string, t[bg] as string)).toBeGreaterThanOrEqual(3);
  });
});
