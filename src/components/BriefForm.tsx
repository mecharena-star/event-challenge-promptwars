"use client";

import { useId, type FormEvent, type Ref } from "react";
import { CATEGORY_LABELS, DIETARY_LABELS } from "@/domain/profiles";
import {
  CURRENCIES,
  DIETARY_NEEDS,
  EVENT_TYPES,
  LIMITS,
  PRIORITY_CATEGORIES,
  type DietaryNeed,
  type EventType,
  type PriorityCategory,
} from "@/domain/schema";
import type { FormErrors, FormState } from "@/lib/form-state";
import { ChoiceGroup, Field } from "./Field";

const EVENT_LABELS: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  community: "Community event",
};
const VENUE_LABELS = {
  undecided: "Not decided yet",
  indoor: "Indoor hall or restaurant",
  outdoor: "Outdoor or garden",
  home: "At home",
} as const;

interface BriefFormProps {
  state: FormState;
  errors: FormErrors;
  busy: boolean;
  minDate: string;
  summaryRef: Ref<HTMLDivElement>;
  onChange: (patch: Partial<FormState>) => void;
  onSubmit: () => void;
  onSample: (type: EventType) => void;
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function BriefForm({ state, errors, busy, minDate, summaryRef, onChange, onSubmit, onSample }: BriefFormProps) {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const errorEntries = Object.entries(errors);
  const prioritiesFull = state.priorities.length >= LIMITS.maxPriorities;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={busy} className="brief">
      <div className="samples">
        <p id={id("samples")}>Want to see it first? Load an example.</p>
        <div role="group" aria-labelledby={id("samples")} className="sample-buttons">
          {EVENT_TYPES.map((type) => (
            <button key={type} type="button" className="button quiet" onClick={() => onSample(type)}>
              {EVENT_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div ref={summaryRef} tabIndex={-1} className="error-summary" hidden={errorEntries.length === 0} role="alert">
        {errorEntries.length > 0 && (
          <>
            <h3>
              Fix {errorEntries.length === 1 ? "this detail" : `these ${errorEntries.length} details`} to continue
            </h3>
            <ul>
              {errorEntries.map(([name, message]) => (
                <li key={name}>
                  <a href={`#${id(name)}`}>{message}</a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ChoiceGroup id={id("eventType")} legend="What are you celebrating?" error={errors.eventType}>
        {EVENT_TYPES.map((type) => (
          <label key={type} className="choice">
            <input
              type="radio"
              name={id("type")}
              value={type}
              checked={state.eventType === type}
              onChange={() => onChange({ eventType: type })}
            />
            <span>{EVENT_LABELS[type]}</span>
          </label>
        ))}
      </ChoiceGroup>

      <Field id={id("title")} label="Event name (optional)" error={errors.title}>
        {(aria) => (
          <input
            {...aria}
            type="text"
            maxLength={LIMITS.title}
            autoComplete="off"
            value={state.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        )}
      </Field>

      <div className="row">
        <Field id={id("eventDate")} label="Event date" error={errors.eventDate}>
          {(aria) => (
            <input
              {...aria}
              type="date"
              min={minDate || undefined}
              value={state.eventDate}
              onChange={(e) => onChange({ eventDate: e.target.value })}
            />
          )}
        </Field>
        <Field id={id("guestCount")} label="Number of guests" error={errors.guestCount}>
          {(aria) => (
            <input
              {...aria}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={state.guestCount}
              onChange={(e) => onChange({ guestCount: e.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="row money">
        <Field id={id("currency")} label="Currency" error={errors.currency}>
          {(aria) => (
            <select
              {...aria}
              value={state.currency}
              onChange={(e) => onChange({ currency: e.target.value as FormState["currency"] })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={id("budget")} label="Total budget" hint="Whole amounts only." error={errors.budget}>
          {(aria) => (
            <input
              {...aria}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={state.budget}
              onChange={(e) => onChange({ budget: e.target.value })}
            />
          )}
        </Field>
      </div>

      <div className="row">
        <Field id={id("location")} label="City or area (optional)" error={errors.location}>
          {(aria) => (
            <input
              {...aria}
              type="text"
              maxLength={LIMITS.location}
              autoComplete="off"
              value={state.location}
              onChange={(e) => onChange({ location: e.target.value })}
            />
          )}
        </Field>
        <Field id={id("venueType")} label="Venue" error={errors.venueType}>
          {(aria) => (
            <select
              {...aria}
              value={state.venueType}
              onChange={(e) => onChange({ venueType: e.target.value as FormState["venueType"] })}
            >
              {Object.entries(VENUE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <ChoiceGroup
        id={id("priorities")}
        legend="What matters most?"
        hint={`Choose up to ${LIMITS.maxPriorities}. These get a larger share of the budget.`}
        error={errors.priorities}
      >
        {PRIORITY_CATEGORIES.map((category: PriorityCategory) => {
          const checked = state.priorities.includes(category);
          return (
            <label key={category} className="choice">
              <input
                type="checkbox"
                checked={checked}
                disabled={!checked && prioritiesFull}
                onChange={() => onChange({ priorities: toggle(state.priorities, category) })}
              />
              <span>{CATEGORY_LABELS[category]}</span>
            </label>
          );
        })}
      </ChoiceGroup>

      <ChoiceGroup id={id("dietary")} legend="Dietary needs among guests" error={errors.dietary}>
        {DIETARY_NEEDS.map((need: DietaryNeed) => (
          <label key={need} className="choice">
            <input
              type="checkbox"
              checked={state.dietary.includes(need)}
              onChange={() => onChange({ dietary: toggle(state.dietary, need) })}
            />
            <span>{DIETARY_LABELS[need]}</span>
          </label>
        ))}
      </ChoiceGroup>

      <ChoiceGroup id={id("guests")} legend="Your guests">
        <label className="choice">
          <input
            type="checkbox"
            checked={state.hasChildren}
            onChange={(e) => onChange({ hasChildren: e.target.checked })}
          />
          <span>Children will attend</span>
        </label>
        <label className="choice">
          <input
            type="checkbox"
            checked={state.needsAccessibility}
            onChange={(e) => onChange({ needsAccessibility: e.target.checked })}
          />
          <span>Some guests need step-free access or reserved seating</span>
        </label>
      </ChoiceGroup>

      <Field
        id={id("notes")}
        label="Anything personal we should know? (optional)"
        hint={`Interests, traditions, must-haves. ${state.notes.length} of ${LIMITS.notes} characters used.`}
        error={errors.notes}
      >
        {(aria) => (
          <textarea
            {...aria}
            rows={4}
            maxLength={LIMITS.notes}
            value={state.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
          />
        )}
      </Field>

      <button type="submit" className="button primary" disabled={busy}>
        {busy ? "Building your plan" : "Build my plan"}
      </button>
    </form>
  );
}
