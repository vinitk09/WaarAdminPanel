"use client";
import { useEffect, useRef } from "react";

const paths = {
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  book: "M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1m0-15c3-2 6-2 9-1v15c-3-1-6-1-9 1V5z",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M8 14h2M14 14h2M8 18h2",
  message: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z",
  file: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
  award: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12M8.2 13.8 7 22l5-3 5 3-1.2-8.2",
  folder: "M3 7v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-7l-2-3H5a2 2 0 0 0-2 2v3z",
  wallet: "M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6M20 12h-5v5h5M16 14.5h.01",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3l-1 3-3 1-2 3 2 2-1 3 2 3 3-1 3 2 3-2 3 1 2-3-1-3 2-2-2-3-3-1-1-3H9z",
  arrow: "M5 12h14m-5-5 5 5-5 5", external: "M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5",
  search: "M21 21l-5-5M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16", plus: "M12 5v14M5 12h14", chevron: "m9 5 7 7-7 7",
  close: "m6 6 12 12M6 18 18 6", edit: "m16 3 5 5M4 20l5-1L21 7l-5-5L4 14v6z", trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  logout: "M9 21H4V3h5M10 12h11m-4-4 4 4-4 4", check: "m5 12 4 4L19 6", refresh: "M20 7v5h-5M4 17v-5h5M5.6 7a7 7 0 0 1 11.6-2L20 8M4 16l2.8 3A7 7 0 0 0 18.4 17",
  shield: "m12 3 9 4v5c0 5-9 9-9 9s-9-4-9-9V7l9-4zM8 12l3 3 5-6", clock: "M12 8v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20", menu: "M4 6h16M4 12h16M4 18h16", download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4", info: "M12 11v6M12 7h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20",
};
export function Icon({ name, size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.file} /></svg>; }
export const groups = [
  { label: "WORKSPACE", items: [["overview", "Dashboard", "grid"], ["enquiries", "Enquiries", "message"]] },
  { label: "ACADEMY", items: [["courses", "Courses & programmes", "book"], ["batches", "Batches & schedule", "calendar"], ["lessons", "Learning content", "folder"], ["tests", "Test series", "file"]] },
  { label: "PEOPLE & ACCESS", items: [["students", "Registered users", "users"], ["registrations", "Course registrations", "file"], ["enrolments", "Course enrolments", "shield"], ["payments", "Payments", "wallet"]] },
  { label: "WEBSITE CONTENT", items: [["pages", "Website pages", "file"], ["faculty", "Faculty", "users"], ["results", "Student results", "award"], ["projects", "Projects", "folder"]] },
];
export const labels = { ...Object.fromEntries(groups.flatMap(group => group.items.map(([id, label]) => [id, label]))), settings: "Settings", audit: "Audit trail" };
export const editable = ["courses", "batches", "lessons", "tests", "faculty", "results", "projects", "pages"];
export const singular = { courses: "course", batches: "batch", lessons: "lesson", tests: "test", faculty: "faculty profile", results: "student result", projects: "project", pages: "website page" };
export const descriptions = { courses: "Manage the programmes that shape every learner’s journey.", students: "Learner accounts registered through the WAARR website.", enrolments: "Review course access, assigned batches and enrolment periods.", enquiries: "Turn the next conversation into someone’s first step.", batches: "Plan the people, dates and capacity behind every programme.", lessons: "Build the learning resources behind your course catalogue.", tests: "Create practice tests with questions, answers and explanations.", payments: "Review website payment records. Demo transactions are identified separately.", faculty: "The people who turn preparation into progress.", results: "Recognise achievement, with the right evidence and context.", projects: "Organise WAARR’s infrastructure and performance project portfolio.", settings: "Keep your academy workspace connected and up to date." };
export const initials = name => (name || "WA").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
descriptions.pages = "Shape the words behind your homepage, solutions and academy pages.";
descriptions.audit = "Who changed what, and when. A clear history of saved workspace changes.";
descriptions.students = "Everyone with a registered learner account on the WAARR website.";
descriptions.registrations = "Course enrolment forms submitted by registered users, including payment follow-up.";
descriptions.enrolments = "People with course enrolment records, their payment mode and current access status.";
export const displayDate = value => { if (!value) return "Not scheduled"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(date); };
export const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
export function Badge({ children }) { const text = String(children || "Draft"); if (text === "Imported") return null; return <span className={`badge ${/active|approved|resolved|completed|ready/i.test(text) ? "green" : /new|draft|sample|unscheduled|verification|demo|pending/i.test(text) ? "amber" : /archived|cancelled|expired/i.test(text) ? "gray" : "rose"}`}><i />{text}</span>; }
export function Empty({ icon = "folder", title, detail, action }) { return <div className="empty"><span className="empty-icon"><Icon name={icon} size={25} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>; }
export async function api(url, options) { const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers } }); const data = await response.json(); if (!response.ok) { const error = new Error(data.error || "Something went wrong. Please try again."); error.status = response.status; throw error; } return data; }
export function Dialog({ title, subtitle, close, children, wide = false, className = "" }) {
  const ref = useRef(null);
  useEffect(() => { const previous = document.activeElement; ref.current.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = overflow; previous?.focus(); }; }, []);
  return <dialog ref={ref} aria-label={title} className={`dialog ${wide ? "wide" : ""} ${className}`} onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === ref.current) { const rect = ref.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close(); } }}><div className="dialog-header"><div><span className="eyebrow">WAARR WORKSPACE</span><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" aria-label="Close dialog" onClick={close}><Icon name="close" /></button></div>{children}</dialog>;
}
