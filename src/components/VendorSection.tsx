"use client";

import { useState } from "react";
import { CATEGORY_LABELS } from "@/domain/profiles";
import type { VendorItem, VendorPriority } from "@/domain/types";
import { formatDate } from "@/lib/format";

const GROUPS: { priority: VendorPriority; title: string }[] = [
  { priority: "essential", title: "Essential" },
  { priority: "recommended", title: "Recommended" },
  { priority: "optional", title: "Optional" },
];

export function VendorSection({ vendors }: { vendors: VendorItem[] }) {
  const [booked, setBooked] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setBooked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <section aria-labelledby="vendors-title" className="section">
      <h3 id="vendors-title">Vendor checklist</h3>
      <p className="lede" role="status">
        {booked.size} of {vendors.length} booked. Tick items as you confirm them; open an item for questions to ask.
      </p>
      {GROUPS.map(({ priority, title }) => {
        const items = vendors.filter((v) => v.priority === priority);
        if (items.length === 0) return null;
        return (
          <fieldset key={priority} className="vendor-group">
            <legend>{title}</legend>
            <ul>
              {items.map((v) => (
                <li key={v.id}>
                  <label className="choice">
                    <input type="checkbox" checked={booked.has(v.id)} onChange={() => toggle(v.id)} />
                    <span>
                      {v.name}
                      <span className="meta">
                        {CATEGORY_LABELS[v.category]}. Book by <time dateTime={v.bookBy}>{formatDate(v.bookBy)}</time>
                      </span>
                    </span>
                  </label>
                  <details>
                    <summary>Questions to ask {v.name.toLowerCase()}</summary>
                    <ul className="questions">
                      {v.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}
    </section>
  );
}
