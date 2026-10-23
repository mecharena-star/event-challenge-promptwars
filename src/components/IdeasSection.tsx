import type { IdeasNotice, IdeasResult } from "@/domain/types";

export type IdeasState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: IdeasResult }
  | { status: "failed" };

const NOTICE_TEXT: Record<IdeasNotice, string> = {
  not_configured: "These are curated ideas matched to your brief. Add a Gemini API key on the server to get ideas written around your notes.",
  timeout: "Gemini took too long, so these are curated ideas matched to your brief.",
  upstream_error: "Gemini could not be reached, so these are curated ideas matched to your brief.",
  invalid_response: "Gemini's reply did not pass our checks, so these are curated ideas matched to your brief.",
};

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

export function IdeasSection({ state }: { state: IdeasState }) {
  return (
    <section aria-labelledby="ideas-title" className="section" aria-busy={state.status === "loading"}>
      <h3 id="ideas-title">Ideas for your day</h3>
      {state.status === "loading" && <p className="lede" role="status">Writing ideas for your brief.</p>}
      {state.status === "failed" && <p className="lede">Ideas could not load. The rest of your plan is complete.</p>}
      {state.status === "ready" && (
        <>
          <p className="lede">{state.result.source === "gemini" ? "Written by Gemini for your brief." : NOTICE_TEXT[state.result.notice ?? "not_configured"]}</p>
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
        </>
      )}
    </section>
  );
}
