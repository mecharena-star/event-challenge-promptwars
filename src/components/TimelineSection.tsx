import { formatStub } from "@/lib/format";
import type { TimelinePlan } from "@/domain/types";

export function TimelineSection({ timeline }: { timeline: TimelinePlan }) {
  return (
    <section aria-labelledby="timeline-title" className="section">
      <h3 id="timeline-title">Your timeline</h3>
      {timeline.compressed && (
        <p className="lede">
          With {timeline.daysAvailable} days to go, we compressed the usual lead time. Steps are ordered by when to do them.
        </p>
      )}
      <ol className="timeline">
        {timeline.milestones.map((m) => (
          <li key={m.id} className={m.critical ? "milestone critical" : "milestone"}>
            <time dateTime={m.dueDate} className="stub">
              {formatStub(m.dueDate)}
            </time>
            <div>
              <p className="milestone-title">
                {m.title}
                {m.urgent && <span className="badge urgent">Do now</span>}
                {m.critical && !m.urgent && <span className="badge key">Key step</span>}
              </p>
              <p>{m.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
