"use client";

import { useEffect, useState } from "react";

import { Dialog, Empty, Icon, labels } from "./admin-ui";
import "./audit-trail.css";
import TableSearch, { matchesTableSearch } from "./table-search";

function timestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date) + " IST";
}
function Value({ value }) {
  if (value === null || value === undefined) return <span className="audit-no-value">Not set</span>;
  return <pre>{typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}</pre>;
}

export default function AuditTrail({ data, query }) {
  const [action, setAction] = useState("All");
  const [collection, setCollection] = useState("All");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [tableQuery, setTableQuery] = useState("");
  const [fieldQuery, setFieldQuery] = useState("");
  useEffect(() => setFieldQuery(""), [selected?.id]);
  const visibleChanges = (selected?.changes || []).filter(change => matchesTableSearch(change, fieldQuery));
  useEffect(() => setPage(1), [action, collection, from, until, query, tableQuery]);
  const events = data.audit || [];
  const actions = [...new Set(events.map(event => event.action).filter(Boolean))];
  const collections = [...new Set(events.map(event => event.collection).filter(Boolean))];
  const visible = events.filter(event => {
    const day = Number.isNaN(new Date(event.at).getTime()) ? "" : new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(event.at));
    return (action === "All" || event.action === action) && (collection === "All" || event.collection === collection) && (!from || day >= from) && (!until || day <= until) && matchesTableSearch([event, labels[event.collection], timestamp(event.at)], query) && matchesTableSearch([event, labels[event.collection], timestamp(event.at)], tableQuery);
  });
  const pages = Math.max(1, Math.ceil(visible.length / 15));
  const current = Math.min(page, pages);
  const rows = visible.slice((current - 1) * 15, current * 15);
  return <>
    <section className="panel audit-panel audit-table-panel">
      <div className="audit-table-heading"><div><h2>Audit records <span>{events.length}</span></h2><p>Successful workspace saves and deletions, newest first.</p></div><span className="audit-heading-icon"><Icon name="clock" size={20} /></span></div>
      <div className="audit-table-searchbar"><TableSearch value={tableQuery} onChange={setTableQuery} label="Search audit records" placeholder="Search records, actions, administrators..." /><span>{visible.length} of {events.length} records</span></div>
      <div className="audit-filters"><label>Action<select value={action} onChange={event => setAction(event.target.value)}><option value="All">All actions</option>{actions.map(item => <option key={item}>{item}</option>)}</select></label><label>Section<select value={collection} onChange={event => setCollection(event.target.value)}><option value="All">All sections</option>{collections.map(item => <option value={item} key={item}>{labels[item] || "Workspace"}</option>)}</select></label><label>From date<input type="date" value={from} max={until || undefined} onChange={event => setFrom(event.target.value)} /></label><label>Until date<input type="date" value={until} min={from || undefined} onChange={event => setUntil(event.target.value)} /></label><button className="button compact" onClick={() => { setAction("All"); setCollection("All"); setFrom(""); setUntil(""); setTableQuery(""); }}>Reset filters</button></div>
      <p className="audit-mobile-hint"><Icon name="arrow" size={13} />Scroll horizontally to see every column.</p>
      <div className="table-scroll audit-grid-scroll"><table className="audit-table" aria-label="Audit trail records"><thead><tr><th scope="col">ACTION</th><th scope="col">RECORD</th><th scope="col">SECTION</th><th scope="col">ADMINISTRATOR</th><th scope="col">DATE &amp; TIME</th><th scope="col">CHANGED FIELDS</th><th scope="col">VIEW</th></tr></thead><tbody>{rows.length ? rows.map(event => <tr key={event.id}>
        <td><span className={"audit-action-label action-" + (event.action || "historical").toLowerCase().replaceAll(" ", "-")}><i />{event.action || "Historical activity"}</span></td>
        <td><strong className="audit-record-name">{event.recordTitle || event.title}</strong><small className="audit-record-summary">{event.title}</small></td>
        <td><span className="audit-section-label">{labels[event.collection] || "Workspace"}</span></td>
        <td><span className="audit-actor">{event.actor || "Not recorded"}</span></td>
        <td><span className="audit-date">{timestamp(event.at)}</span></td>
        <td><span className="audit-field-count">{event.changes?.length || 0}</span></td>
        <td><button className="icon-button view-icon-button" aria-label={"View audit event " + event.id} title="View change details" onClick={() => setSelected(event)}><Icon name="eye" size={18} /></button></td>
      </tr>) : <tr><td colSpan={7}><Empty icon="clock" title={events.length ? "No matching audit events" : "No audit records yet"} detail={events.length ? "Try a different action, section, date or search." : "Successful workspace saves and deletions will appear in this table."} /></td></tr>}</tbody></table></div>
      <div className="pagination"><span>{visible.length ? "Showing " + ((current - 1) * 15 + 1) + "-" + Math.min(current * 15, visible.length) + " of " + visible.length + " records" : "0 records"}</span><div><button className="button compact" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button><span>{current} / {pages}</span><button className="button compact" disabled={current >= pages} onClick={() => setPage(current + 1)}>Next</button></div></div>
      <p className="audit-table-footnote"><Icon name="shield" size={14} />Earlier activity is retained where available. Website registrations and payments are listed separately.</p>
    </section>
    {selected && <Dialog title="Audit event details" subtitle={selected.title} close={() => setSelected(null)} className="audit-event-dialog" wide><div className="dialog-body audit-details"><dl className="audit-event-facts"><div><dt>Administrator</dt><dd>{selected.actor || "Not recorded"}</dd></div><div><dt>Date &amp; time</dt><dd>{timestamp(selected.at)}</dd></div><div><dt>Action / section</dt><dd>{selected.action || "Historical activity"} / {labels[selected.collection] || "Workspace"}</dd></div><div><dt>Record</dt><dd>{selected.recordTitle || selected.title}</dd></div></dl><h3 className="audit-changes-title">Changed fields</h3><div className="table-search-toolbar"><TableSearch value={fieldQuery} onChange={setFieldQuery} label="Search changed fields" placeholder="Search fields and before / after values..." /><span>{visibleChanges.length} of {selected.changes?.length || 0} fields</span></div><div className="table-scroll"><table className="audit-changes-table" aria-label="Field changes"><thead><tr><th scope="col">FIELD</th><th scope="col">BEFORE</th><th scope="col">AFTER</th></tr></thead><tbody>{visibleChanges.length ? visibleChanges.map(change => <tr key={change.field}><th scope="row">{change.field.replace(/([A-Z])/g, " $1")}</th><td><Value value={change.before} /></td><td><Value value={change.after} /></td></tr>) : <tr><td colSpan={3}><p>{fieldQuery.trim() ? "No matching changed fields. Try another search or clear the search." : selected.action === "Historical activity" ? "This historical event has no field-level history. Its original activity, administrator and timestamp are retained." : "The save did not change any tracked fields."}</p></td></tr>}</tbody></table></div></div><div className="dialog-footer"><button className="button" onClick={() => setSelected(null)}>Close</button></div></Dialog>}
  </>;
}
