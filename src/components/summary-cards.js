"use client";

import { Icon } from "./admin-ui";
import "./summary-cards.css";

export default function SummaryCards({ items, label = "Registration summary" }) {
  return <section className="summary-cards" aria-label={label}>
    {items.map(item => <article className={`summary-card summary-tone-${item.tone || "wine"}`} key={item.label}>
      <div className="summary-card-heading"><span>{item.label}</span><span className="summary-card-icon"><Icon name={item.icon} size={20} /></span></div>
      <strong className="summary-card-value">{new Intl.NumberFormat("en-IN").format(item.value)}</strong>
      <p className="summary-card-caption"><i />{item.caption}</p>
    </article>)}
  </section>;
}
