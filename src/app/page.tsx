import { PlanApp } from "@/components/PlanApp";

export default function Home() {
  return (
    <>
      <header className="site-header no-print">
        <p className="brand">Jashn</p>
        <h1>Plan the day. Keep the budget honest.</h1>
        <p className="intro">
          Tell us about a wedding, birthday or community event. We build a budget that explains itself, a timeline that
          adapts to how much time you have, and a vendor checklist you can act on today.
        </p>
      </header>
      <main id="main" tabIndex={-1}>
        <PlanApp />
      </main>
      <footer className="site-footer no-print">
        <p>
          Plans are generated in your browser session and are not stored. Budget shares and per-guest floors are
          planning heuristics, not quotes.
        </p>
      </footer>
    </>
  );
}
