"use client";

import { Icon } from "./admin-ui";
import "./table-search.css";

export function matchesTableSearch(values, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const flatten = value => value == null ? "" : typeof value === "object" ? Object.values(value).map(flatten).join(" ") : String(value);
  const searchable = flatten(values).toLocaleLowerCase().replace(/\s+/g, " ");
  return terms.every(term => searchable.includes(term));
}

export default function TableSearch({ value, onChange, label = "Search table", placeholder = "Search this table..." }) {
  return <div className="table-search"><Icon name="search" size={17} /><input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === "Escape" && value) { event.preventDefault(); event.stopPropagation(); onChange(""); } }} />{value && <button type="button" aria-label={`Clear ${label.toLowerCase()}`} title="Clear search" onClick={() => onChange("")}><Icon name="close" size={14} /></button>}</div>;
}
