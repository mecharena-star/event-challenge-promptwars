import { formatMoney } from "@/domain/money";
import { CATEGORY_LABELS } from "@/domain/profiles";
import type { BudgetPlan, PerGuestStatus } from "@/domain/types";

const STATUS_TEXT: Record<PerGuestStatus, string> = {
  tight: "tight for this guest count",
  balanced: "in a comfortable range",
  comfortable: "generous for this guest count",
};

export function BudgetSection({ budget }: { budget: BudgetPlan }) {
  const money = (n: number) => formatMoney(n, budget.currency);
  const largest = Math.max(...budget.lines.map((l) => l.amount), 1);
  return (
    <section aria-labelledby="budget-title" className="section">
      <h3 id="budget-title">Where the money goes</h3>
      <p className="lede">
        {money(budget.perGuest)} per guest overall, {STATUS_TEXT[budget.perGuestStatus]}. Food and drink works out to about {money(budget.cateringPerGuest)} a guest.
      </p>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Budget split by category, in {budget.currency}</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col" className="num">Share</th>
              <th scope="col" className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((line) => (
              <tr key={line.category}>
                <th scope="row">
                  {CATEGORY_LABELS[line.category]}
                  <svg className="bar" viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                    <rect width="100" height="4" className="bar-track" />
                    <rect width={Math.max(1, (line.amount / largest) * 100)} height="4" className="bar-fill" />
                  </svg>
                  {line.notes.length > 0 && <span className="row-notes">{line.notes.join(" ")}</span>}
                </th>
                <td className="num">{line.sharePct}%</td>
                <td className="num">{money(line.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num">100%</td>
              <td className="num">{money(budget.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
