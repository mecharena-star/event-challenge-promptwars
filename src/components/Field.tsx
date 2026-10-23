import type { ReactNode } from "react";

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby": string | undefined }) => ReactNode;
}

/** Label, hint and error wired to one control with the right ARIA relationships. */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {error && (
        <p id={errorId} className="error-text">
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      )}
    </div>
  );
}

interface ChoiceGroupProps {
  id: string;
  legend: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** A fieldset for radio or checkbox groups, with the same hint and error wiring. */
export function ChoiceGroup({ id, legend, hint, error, children }: ChoiceGroupProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset id={id} className="field choice-group" aria-describedby={describedBy}>
      <legend>{legend}</legend>
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      <div className="choices">{children}</div>
      {error && (
        <p id={errorId} className="error-text">
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      )}
    </fieldset>
  );
}
