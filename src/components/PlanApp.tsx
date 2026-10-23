"use client";

import { useEffect, useRef, useState } from "react";
import { buildCalendar } from "@/domain/ics";
import type { EventBrief, EventType } from "@/domain/schema";
import type { IdeasResult, Plan } from "@/domain/types";
import { ApiError, postJson } from "@/lib/api-client";
import {
  INITIAL_FORM,
  localTodayIso,
  sampleForm,
  validateForm,
  type FormErrors,
  type FormState,
} from "@/lib/form-state";
import { BriefForm } from "./BriefForm";
import type { IdeasState } from "./IdeasSection";
import { PlanView } from "./PlanView";

type PlanState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; plan: Plan; brief: EventBrief }
  | { status: "error"; message: string };

/** The ideas endpoint accepts at most this many themes to avoid. */
const MAX_AVOIDED_THEMES = 6;

function downloadText(filename: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function PlanApp() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [planState, setPlanState] = useState<PlanState>({ status: "idle" });
  const [ideas, setIdeas] = useState<IdeasState>({ status: "idle" });
  const [shownThemes, setShownThemes] = useState<string[]>([]);
  const [minDate, setMinDate] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const abortRef = useRef<AbortController | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The user's local date is only known in the browser; setting it after mount avoids a hydration mismatch.
  useEffect(() => {
    setMinDate(localTodayIso());
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (Object.keys(errors).length > 0) summaryRef.current?.focus();
  }, [errors]);

  useEffect(() => {
    if (planState.status === "ready") headingRef.current?.focus();
  }, [planState]);

  /** Ideas are slower and optional, so they load on their own and never block the plan. */
  async function loadIdeas(brief: EventBrief, avoidThemes: string[], signal: AbortSignal) {
    setIdeas({ status: "loading" });
    try {
      const { ideas: result } = await postJson<{ ideas: IdeasResult }>("/api/ideas", { ...brief, avoidThemes }, signal);
      setIdeas({ status: "ready", result });
      setShownThemes((prev) => [...prev, ...result.ideas.themes.map((t) => t.name)].slice(-MAX_AVOIDED_THEMES));
      setAnnouncement(avoidThemes.length > 0 ? "New ideas are ready" : "Ideas are ready");
    } catch {
      if (!signal.aborted) {
        setIdeas({ status: "failed" });
        setAnnouncement("Ideas could not load. The rest of your plan is complete.");
      }
    }
  }

  async function submit() {
    const result = validateForm(form, localTodayIso());
    if ("errors" in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPlanState({ status: "loading" });
    setShownThemes([]);
    setAnnouncement("Building your plan");
    void loadIdeas(result.brief, [], controller.signal);

    try {
      const { plan } = await postJson<{ plan: Plan }>("/api/plan", result.brief, controller.signal);
      setPlanState({ status: "ready", plan, brief: result.brief });
      setAnnouncement("Your plan is ready");
    } catch (error) {
      if (controller.signal.aborted) return;
      setIdeas({ status: "idle" });
      if (error instanceof ApiError && error.code === "invalid_brief") {
        setPlanState({ status: "idle" });
        setErrors(error.fields);
      } else {
        const message =
          error instanceof ApiError
            ? error.message
            : "We could not reach the server. Check your connection and try again.";
        setPlanState({ status: "error", message });
        setAnnouncement(message);
      }
    }
  }

  function showDifferentIdeas() {
    if (planState.status !== "ready") return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    void loadIdeas(planState.brief, shownThemes, controller.signal);
  }

  function loadSample(type: EventType) {
    setForm(sampleForm(type, localTodayIso()));
    setErrors({});
  }

  const busy = planState.status === "loading";

  return (
    <div className="workspace">
      <section aria-labelledby="brief-title" className="panel brief-panel">
        <h2 id="brief-title">Tell us about the day</h2>
        <BriefForm
          state={form}
          errors={errors}
          busy={busy}
          minDate={minDate}
          summaryRef={summaryRef}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onSubmit={submit}
          onSample={loadSample}
        />
      </section>

      <section aria-label="Your plan" className="results">
        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
        {planState.status === "idle" && (
          <div className="empty">
            <h2>Your plan appears here</h2>
            <p>
              You will get a budget split with reasons, a dated timeline, a vendor checklist with questions to ask, and
              ideas for the day.
            </p>
            <p>Not sure where to start? Load an example on the left.</p>
            <details className="how">
              <summary>How this planner works, and what it cannot do</summary>
              <ul>
                <li>
                  Budget, dates and checklists come from fixed rules, so the same details always give the same plan, and
                  each adjustment explains itself.
                </li>
                <li>
                  Ideas are written by an AI model. It can be wrong, so confirm prices, availability and dietary details
                  with vendors.
                </li>
                <li>Budget shares and per-guest guides are planning heuristics, not quotes from any vendor.</li>
                <li>
                  Nothing you enter is stored. Emails, phone numbers and keys in your notes are removed before anything
                  reaches the AI.
                </li>
              </ul>
            </details>
          </div>
        )}
        {planState.status === "loading" && (
          <p className="empty" role="status">
            Building your plan.
          </p>
        )}
        {planState.status === "error" && (
          <div className="empty" role="alert">
            <h2>We could not build your plan</h2>
            <p>{planState.message}</p>
          </div>
        )}
        {planState.status === "ready" && (
          <PlanView
            plan={planState.plan}
            ideas={ideas}
            headingRef={headingRef}
            onDownloadCalendar={() =>
              downloadText("celebration-plan.ics", "text/calendar", buildCalendar(planState.plan, new Date()))
            }
            onPrint={() => window.print()}
            onMoreIdeas={showDifferentIdeas}
          />
        )}
      </section>
    </div>
  );
}
