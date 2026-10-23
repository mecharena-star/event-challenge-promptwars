import type { IdeasNotice, IdeasResult } from "@/domain/types";

export type IdeasState =
  { status: "idle" } | { status: "loading" } | { status: "ready"; result: IdeasResult } | { status: "failed" };

const NOTICE_TEXT: Record<IdeasNotice, string> = {
  not_configured:
    "These are curated ideas matched to your brief. Add a Gemini API key on the server to get ideas written around your notes.",
  timeout: "Gemini took too long, so these are curated ideas matched to your brief.",
  upstream_error: "Gemini could not be reached, so these are curated ideas matched to your brief.",
  invalid_response: "Gemini's reply did not pass our checks, so these are curated ideas matched to your brief.",
  blocked_output: "Gemini's reply was stopped by a safety check, so these are curated ideas matched to your brief.",
  notes_ignored: "Written by Gemini. We left your notes out because they looked like instructions to the AI.",
};

function describeSource({ source, notice }: IdeasResult): string {
  if (source === "gemini") return notice ? NOTICE_TEXT[notice] : "Written by Gemini for your brief.";
  return NOTICE_TEXT[notice ?? "not_configured"];
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="idea-list">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

interface IdeasSectionProps {
  state: IdeasState;
  onMore: () => void;
}

export function IdeasSection({ state, onMore }: IdeasSectionProps) {
  const loading = state.status === "loading";
  return (
    <section aria-labelledby="ideas-title" className="section" aria-busy={loading}>
      <h3 id="ideas-title">Ideas for your day</h3>
      {loading && (
        <p className="lede" role="status">
          Writing ideas for your brief.
        </p>
      )}
      {state.status === "failed" && <p className="lede">Ideas could not load. The rest of your plan is complete.</p>}
      {state.status === "ready" && (
        <>
          <p className="lede">{describeSource(state.result)}</p>
          <ul className="themes">
            {state.result.ideas.themes.map((t) => (
              <li key={t.name}>
                <p className="theme-name">{t.name}</p>
                <p>{t.description}</p>
                <p className="meta">{t.whyItFits}</p>
              </li>
            ))}
          </ul>
          <div className="idea-grid">
            <List title="Menu" items={state.result.ideas.menuIdeas} />
            <List title="Activities" items={state.result.ideas.activities} />
            <List title="Decor" items={state.result.ideas.decorTips} />
            <List title="Ways to save" items={state.result.ideas.savingTips} />
          </div>
          <p className="meta">
            Ideas are suggestions, and AI can be wrong. Confirm prices, availability and any dietary or safety detail
            with each vendor.
          </p>
        </>
      )}
      {state.status !== "idle" && (
        <p className="ideas-actions no-print">
          {/* aria-disabled, not disabled, so keyboard focus is not lost while new ideas load. */}
          <button type="button" className="button quiet" aria-disabled={loading} onClick={loading ? undefined : onMore}>
            Show different ideas
          </button>
        </p>
      )}
    </section>
  );
}
