import type { Ref } from "react";
import type { Plan } from "@/domain/types";
import { formatDate, pluralise } from "@/lib/format";
import { AdvisoryList } from "./AdvisoryList";
import { BudgetSection } from "./BudgetSection";
import { IdeasSection, type IdeasState } from "./IdeasSection";
import { TimelineSection } from "./TimelineSection";
import { VendorSection } from "./VendorSection";

interface PlanViewProps {
  plan: Plan;
  ideas: IdeasState;
  headingRef: Ref<HTMLHeadingElement>;
  onDownloadCalendar: () => void;
  onPrint: () => void;
  onMoreIdeas: () => void;
}

export function PlanView({ plan, ideas, headingRef, onDownloadCalendar, onPrint, onMoreIdeas }: PlanViewProps) {
  const { summary } = plan;
  return (
    <article aria-labelledby="plan-title" className="plan">
      <header className="plan-head">
        <h2 id="plan-title" ref={headingRef} tabIndex={-1}>
          {summary.title || "Your celebration"}
        </h2>
        <p className="countdown">
          <strong>{summary.daysAvailable}</strong> {summary.daysAvailable === 1 ? "day" : "days"} to go
        </p>
        <p>
          {formatDate(summary.eventDate)} for {pluralise(summary.guestCount, "guest")}
        </p>
        <div className="actions no-print">
          <button type="button" className="button" onClick={onDownloadCalendar}>
            Download calendar file
          </button>
          <button type="button" className="button quiet" onClick={onPrint}>
            Print or save as PDF
          </button>
        </div>
      </header>
      <AdvisoryList advisories={plan.advisories} />
      <BudgetSection budget={plan.budget} />
      <TimelineSection timeline={plan.timeline} />
      <VendorSection vendors={plan.vendors} />
      <IdeasSection state={ideas} onMore={onMoreIdeas} />
    </article>
  );
}
