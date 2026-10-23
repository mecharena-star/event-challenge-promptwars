// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import axe from "axe-core";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlanApp } from "@/components/PlanApp";
import { createIdeasHandler, createPlanHandler, type Deps } from "@/server/handlers";
import { loadEnv } from "@/server/env";
import { createRateLimiter } from "@/server/rate-limit";

/** Routes the browser's fetch calls to the real server handlers, so this exercises the whole stack. */
function installFetch(now: Date) {
  const deps: Deps = {
    env: loadEnv({}),
    now: () => now,
    generator: null,
    planLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    ideasLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
  };
  const plan = createPlanHandler(deps);
  const ideas = createIdeasHandler(deps);
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const request = new Request(`https://jashn.test${url}`, {
      ...init,
      headers: { ...init.headers, host: "jashn.test" },
    });
    return url === "/api/plan" ? plan(request) : ideas(request);
  });
}

async function violations(container: HTMLElement) {
  const result = await axe.run(container, {
    // jsdom has no layout engine, so colour contrast is verified separately in a11y-contrast.test.ts.
    rules: { "color-contrast": { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

describe("PlanApp accessibility and flow", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date());
    installFetch(new Date());
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("has no detectable violations on first load", async () => {
    const { container } = render(<PlanApp />);
    expect(await violations(container)).toEqual([]);
  });

  it("shows an error summary with working links, moves focus to it, and stays accessible", async () => {
    const { container } = render(<PlanApp />);
    fireEvent.click(screen.getByRole("button", { name: "Build my plan" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveFocus();
    expect(alert.querySelectorAll("a[href^='#']").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByLabelText("Number of guests")).toHaveAttribute("aria-invalid", "true");
    expect(await violations(container)).toEqual([]);
  });

  it("builds a plan from an example, focuses the result, and stays accessible", async () => {
    const { container } = render(<PlanApp />);
    fireEvent.click(screen.getByRole("button", { name: "Birthday" }));
    fireEvent.click(screen.getByRole("button", { name: "Build my plan" }));

    const heading = await screen.findByRole("heading", { name: "Mira's 7th birthday" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(document.querySelector(".countdown")).toHaveTextContent(/\d+ days to go/);
    expect(screen.getByRole("table")).toBeInTheDocument();
    await screen.findByText(/curated ideas matched to your brief/);
    expect(await violations(container)).toEqual([]);
  });

  it("tracks vendor progress with native checkboxes", async () => {
    render(<PlanApp />);
    fireEvent.click(screen.getByRole("button", { name: "Community event" }));
    fireEvent.click(screen.getByRole("button", { name: "Build my plan" }));
    await screen.findByText(/0 of \d+ booked/);
    fireEvent.click(screen.getAllByRole("checkbox", { name: /Venue or open space/ })[0] as HTMLElement);
    expect(screen.getByText(/1 of \d+ booked/)).toBeInTheDocument();
  });

  it("offers different ideas on request, keeps focus on the button, and announces the result", async () => {
    const { container } = render(<PlanApp />);
    fireEvent.click(screen.getByRole("button", { name: "Birthday" }));
    fireEvent.click(screen.getByRole("button", { name: "Build my plan" }));
    await screen.findByText(/curated ideas matched to your brief/);
    const firstThemes = [...container.querySelectorAll(".theme-name")].map((n) => n.textContent);

    const more = screen.getByRole("button", { name: "Show different ideas" });
    more.focus();
    fireEvent.click(more);
    await screen.findByText("New ideas are ready");
    await waitFor(() => {
      const next = [...container.querySelectorAll(".theme-name")].map((n) => n.textContent);
      expect(next.length).toBeGreaterThan(0);
      expect(next.some((name) => firstThemes.includes(name))).toBe(false);
    });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Show different ideas" }));
    expect(await violations(container)).toEqual([]);
  });

  it("explains how the planner works and its limits before the first plan", () => {
    render(<PlanApp />);
    fireEvent.click(screen.getByText("How this planner works, and what it cannot do"));
    expect(screen.getByText(/AI can be wrong|It can be wrong/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing you enter is stored/)).toBeInTheDocument();
  });
});
