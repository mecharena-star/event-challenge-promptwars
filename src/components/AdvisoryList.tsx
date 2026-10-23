import type { Advisory, Severity } from "@/domain/types";

const LABEL: Record<Severity, string> = { critical: "Urgent", warning: "Heads up", info: "Good to know" };

export function AdvisoryList({ advisories }: { advisories: Advisory[] }) {
  if (advisories.length === 0) return null;
  return (
    <section aria-labelledby="advisories-title" className="section">
      <h3 id="advisories-title">What we noticed</h3>
      <ul className="advisories">
        {advisories.map((a) => (
          <li key={a.id} className={`advisory ${a.severity}`}>
            <p className="advisory-title">
              <span className="badge">{LABEL[a.severity]}</span> {a.title}
            </p>
            <p>{a.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
