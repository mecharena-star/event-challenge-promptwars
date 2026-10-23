"use client";

import { useEffect, useRef, useState } from "react";
import { buildCalendar } from "@/domain/ics";
import type { EventType } from "@/domain/schema";
import type { IdeasResult, Plan } from "@/domain/types";
import { ApiError, postJson } from "@/lib/api-client";
import { INITIAL_FORM, localTodayIso, sampleForm, validateForm, type FormErrors, type FormState } from "@/lib/form-state";
import { BriefForm } from "./BriefForm";
import type { IdeasState } from "./IdeasSection";
import { PlanView } from "./PlanView";

type PlanState = { status: "idle" } | { status: "loading" } | { status: "ready"; plan: Plan } | { status: "error"; message: string };

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
    setIdeas({ status: "loading" });
    setAnnouncement("Building your plan");

    // Ideas are slower and optional, so they load in parallel and never block the plan.
    postJson<{ ideas: IdeasResult }>("/api/ideas", result.brief, controller.signal)
      .then(({ ideas: payload }) => setIdeas({ status: "ready", result: payload }))
      .catch(() => {
        if (!controller.signal.aborted) setIdeas({ status: "failed" });
      });

    try {
      const { plan } = await postJson<{ plan: Plan }>("/api/plan", result.brief, controller.signal);
      setPlanState({ status: "ready", plan });
      setAnnouncement("Your plan is ready");
    } catch (error) {
      if (controller.signal.aborted) return;
      setIdeas({ status: "idle" });
      if (error instanceof ApiError && error.code === "invalid_brief") {
        setPlanState({ status: "idle" });
        setErrors(error.fields);
      } else {
        const message = error instanceof ApiError ? error.message : "We could not reach the server. Check your connection and try again.";
        setPlanState({ status: "error", message });
        setAnnouncement(message);
      }
    }
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
            <p>You will get a budget split with reasons, a dated timeline, a vendor checklist with questions to ask, and ideas for the day.</p>
            <p>Not sure where to start? Load an example on the left.</p>
          </div>
        )}
        {planState.status === "loading" && <p className="empty" role="status">Building your plan.</p>}
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
            onDownloadCalendar={() => downloadText("celebration-plan.ics", "text/calendar", buildCalendar(planState.plan, new Date()))}
            onPrint={() => window.print()}
          />
        )}
      </section>
    </div>
  );
}
