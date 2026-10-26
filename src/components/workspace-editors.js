"use client";
import { useState } from "react";
import { Icon, Dialog, api, singular, displayDate, initials } from "./admin-ui";

export function AuthScreen({ auth, error: initialError, onSuccess, retry }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const demo = auth?.demoLogin;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await api("/api/admin/auth", { method: "POST", body: JSON.stringify({ email: fields.email, password: fields.password, action: "login" }) });
      await onSuccess(response.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <div className="auth-page">
    <div className="auth-story">
      <div className="auth-brand"><img src="/logo.png" alt="" /><strong>WAARR<span>DEFENCE ACADEMY</span></strong></div>
      <div className="auth-copy"><span className="hero-kicker">PREPARATION HAS A PURPOSE.</span><h1>Behind every<br />great journey,<br /><em>a great team.</em></h1><p>Your courses, learners and conversations.<br />One considered space to bring it all together.</p><div className="auth-rule" /><span className="auth-footnote">DEFENCE &middot; EDUCATION &middot; PERFORMANCE</span></div>
    </div>
    <div className="auth-form-wrap"><div className="auth-form">
      <span className="section-icon"><Icon name="shield" size={25} /></span><p className="eyebrow">THE WAARR WORKSPACE</p><h2>Welcome back.</h2><p>Sign in to take care of what comes next.</p>
      <form onSubmit={submit}>
        <label>Email address<input name="email" type="email" autoComplete="username" placeholder="you@youracademy.com" defaultValue={demo?.email || ""} required maxLength={254} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" defaultValue={demo?.password || ""} minLength={1} maxLength={200} required /></label>
        {(error || initialError) && <p className="form-error" role="alert">{error || initialError}</p>}
        {!auth && <button type="button" className="button" onClick={retry}>Retry connection</button>}
        {demo && <div className="demo-login"><strong>Demo login</strong><span>Email: <b>{demo.email}</b></span><span>Password: <b>{demo.password}</b></span></div>}
        <button className="button primary auth-submit" disabled={busy || !auth}>{busy ? <><span className="spinner" />Opening workspace...</> : <>Sign in to workspace<Icon name="arrow" size={18} /></>}</button>
      </form>
      <div className="auth-security"><Icon name="shield" size={15} /><span>Private access for your academy team.</span></div>
    </div><span className="auth-copyright">WAARR Defence Academy &middot; Administration</span></div>
  </div>;
}

const statuses = ["Draft", "Ready for review", "Approved", "Archived", "Sample profile", "Needs verification", "Unscheduled", "Scheduled", "Completed", "Cancelled"];
export function Editor({ collection, item, courses, faculty = [], save, close }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [questions, setQuestions] = useState(item?.questions || [{ prompt: "", options: ["", "", "", ""], correct: 0, explanation: "" }]);
  const [syllabus, setSyllabus] = useState(item?.syllabus || []);
  const [facultyIds, setFacultyIds] = useState(() => item?.facultyIds || faculty.filter(member => item?.teachers?.some(teacher => teacher.name === member.name)).map(member => member.id));
  const [facultyChanged, setFacultyChanged] = useState(false);
  const importedOnly = !Array.isArray(item?.facultyIds) ? (item?.teachers || []).filter(teacher => !faculty.some(member => member.name === teacher.name)) : [];
  const fields = {
    pages: [["title", "Page name", "text", true], ["slug", "Record slug", "text", true], ["pathname", "Website path", "text", true], ["heroTitle", "Hero heading", "text"], ["seoTitle", "SEO title", "text"], ["seoDescription", "SEO description", "textarea"], ["body", "Page copy · paragraph drafts", "textarea"]],
    courses: [["title", "Course title", "text", true], ["slug", "URL slug", "text", true], ["short", "Short name", "text"], ["category", "Category", "category"], ["description", "Course overview", "textarea"], ["audience", "Who is it for?", "textarea"], ["focus", "Learning focus · one item per line", "list"], ["availability", "Availability", "text"]],
    faculty: [["name", "Full name", "text", true], ["slug", "Profile slug", "text", true], ["role", "Teaching role", "text"], ["subjects", "Subjects · one per line", "list"], ["introduction", "Introduction", "textarea"]],
    results: [["name", "Student name", "text", true], ["exam", "Examination / pathway", "text", true], ["outcome", "Outcome", "outcome"], ["month", "Month", "month"], ["year", "Year", "number", true]],
    projects: [["title", "Project name", "text", true], ["slug", "Project slug", "text", true], ["area", "Focus area", "text"], ["category", "Project category", "text"]],
    batches: [["title", "Batch name", "text", true], ["courseId", "Course", "course", true], ["startsAt", "Start date & time (your local timezone)", "datetime-local"], ["capacity", "Learner capacity", "number"], ["faculty", "Assigned faculty", "text"]],
    lessons: [["title", "Lesson title", "text", true], ["courseId", "Course", "course", true], ["section", "Module / section", "text"], ["body", "Lesson content", "textarea", true], ["videoUrl", "Video resource URL (HTTPS)", "url"]],
    tests: [["title", "Test title", "text", true], ["courseId", "Course", "course", true], ["duration", "Time limit in minutes", "number", true]],
  }[collection];
  function defaultValue(key) {
    if (key === "status") return item?.status === "Imported" ? "" : item?.status || (collection === "batches" ? "Unscheduled" : "Draft");
    if (key === "year") return item?.year || new Date().getFullYear();
    if (key === "capacity") return item?.capacity || 0;
    if (key === "duration") return item?.duration || 30;
    if (key === "startsAt" && item?.startsAt) { const date = new Date(item.startsAt); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
    if (Array.isArray(item?.[key])) return item[key].join("\n");
    return item?.[key] || "";
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const record = Object.fromEntries(new FormData(event.currentTarget));
      for (const [key, , type] of fields) { if (type === "list") record[key] = record[key].split("\n").map(value => value.trim()).filter(Boolean); if (type === "number") record[key] = Number(record[key]); }
      if (record.startsAt) record.startsAt = new Date(record.startsAt).toISOString();
      if (collection === "batches" && record.status === "Scheduled" && !record.startsAt) throw new Error("Choose a start date for a scheduled batch.");
      if (collection === "tests") record.questions = questions;
      if (collection === "courses") { record.syllabus = syllabus; if (facultyChanged || !item) record.facultyIds = facultyIds; }
      await save(collection, record, item?.id); close();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function updateQuestion(index, key, value) { setQuestions(previous => previous.map((question, i) => i === index ? { ...question, [key]: value } : question)); }
  return <Dialog title={`${item ? "Edit" : "Create"} ${singular[collection]}`} subtitle="Save changes to your academy workspace." close={() => { if (!busy) close(); }} wide={collection === "tests" || collection === "courses"}><form onSubmit={submit}><div className="dialog-body"><div className="form-grid">{fields.map(([key, label, type, required]) => <label key={key} className={["textarea", "list"].includes(type) ? "full-width" : ""}>{label}{required && <span className="required"> *</span>}{["textarea", "list"].includes(type) ? <textarea name={key} defaultValue={defaultValue(key)} rows={type === "list" ? 3 : 4} required={required} maxLength={key === "body" ? 12000 : 4000} /> : ["category", "course", "month", "outcome"].includes(type) ? <select name={key} defaultValue={defaultValue(key)} required={required}>{type === "course" ? <><option value="">Choose a course</option>{courses.map(course => <option value={course.slug} key={course.id}>{course.title}</option>)}</> : (type === "category" ? ["Defence", "Professional Education"] : type === "month" ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] : ["Recommended", "Written examination cleared", "Final selection", "Other achievement"]).map(option => <option key={option}>{option}</option>)}</select> : <input name={key} type={type} defaultValue={defaultValue(key)} required={required} min={key === "year" ? 1900 : 0} max={key === "year" ? 2200 : key === "duration" ? 600 : 10000} maxLength={key === "slug" ? 120 : 2000} pattern={key === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined} />}</label>)}<label>Status<select name="status" defaultValue={defaultValue("status")} required><option value="" disabled>Choose a status</option>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select></label></div>
      {collection === "courses" && <section className="faculty-assignment" aria-label="Course faculty assignment"><div className="builder-title"><h3><Icon name="users" size={17} />Assign faculty</h3><span>{facultyIds.length} selected</span></div><p>Select the faculty members who will teach this course. You can assign more than one.</p>{importedOnly.length > 0 && !facultyChanged && <p className="faculty-import-note">Imported teachers: {importedOnly.map(teacher => teacher.name).join(", ")}. The imported team is kept unless you change the selection below. Add their profiles in Faculty to include them in your selection.</p>}{faculty.length ? <fieldset className="faculty-options"><legend className="sr-only">Choose course faculty</legend>{faculty.map(member => <label className={facultyIds.includes(member.id) ? "faculty-option selected" : "faculty-option"} key={member.id}><input type="checkbox" checked={facultyIds.includes(member.id)} onChange={event => { setFacultyChanged(true); setFacultyIds(previous => event.target.checked ? [...previous, member.id] : previous.filter(id => id !== member.id)); }} /><span className="avatar">{initials(member.name)}</span><span className="faculty-option-copy"><strong>{member.name}</strong><small>{member.role || "Faculty member"}</small><span>{member.subjects?.join(" / ") || "No subjects added"}</span>{member.status && <em>{member.status}</em>}</span></label>)}</fieldset> : <p className="field-note">Add a profile under Faculty first, then reopen this course to assign them.</p>}<button type="button" className="text-button" onClick={() => { setFacultyChanged(true); setFacultyIds([]); }}>Clear all assignments</button><small className="faculty-assignment-note">Save changes to apply your selection. Assignments are saved in this admin workspace.</small></section>}
      {collection === "courses" && <div className="question-builder"><div className="builder-title"><h3>Course syllabus</h3><span>{syllabus.length} modules</span></div>{syllabus.map((module, index) => <div className="question-card" key={index}><div className="builder-title"><strong>MODULE {index + 1}</strong><button type="button" className="icon-button danger" aria-label={`Remove module ${index + 1}`} onClick={() => setSyllabus(previous => previous.filter((_, i) => i !== index))}><Icon name="trash" size={15} /></button></div><label>Module title<input value={module.title} required maxLength={200} onChange={event => setSyllabus(previous => previous.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry))} /></label><label>Topics · one per line<textarea value={module.topics.join("\n")} required rows={3} onChange={event => setSyllabus(previous => previous.map((entry, i) => i === index ? { ...entry, topics: event.target.value.split("\n") } : entry))} /></label></div>)}<button type="button" className="button" onClick={() => setSyllabus(previous => [...previous, { title: "", topics: [""] }])}><Icon name="plus" size={15} />Add module</button></div>}
      {collection === "tests" && <div className="question-builder"><div className="builder-title"><h3>Questions & answers</h3><span>{questions.length} questions</span></div>{questions.map((question, index) => <div className="question-card" key={index}><div className="builder-title"><strong>QUESTION {index + 1}</strong>{questions.length > 1 && <button type="button" className="icon-button danger" aria-label={`Remove question ${index + 1}`} onClick={() => setQuestions(previous => previous.filter((_, i) => i !== index))}><Icon name="trash" size={15} /></button>}</div><label>Question<textarea rows={2} required value={question.prompt} maxLength={2000} onChange={event => updateQuestion(index, "prompt", event.target.value)} /></label><label>Answer options · one per line<textarea rows={4} required value={question.options.join("\n")} onChange={event => updateQuestion(index, "options", event.target.value.split("\n"))} /></label><label>Correct answer<select value={question.correct} onChange={event => updateQuestion(index, "correct", Number(event.target.value))}>{question.options.map((option, optionIndex) => <option key={optionIndex} value={optionIndex}>{optionIndex + 1}. {option || "Untitled option"}</option>)}</select></label><label>Answer explanation<textarea rows={2} value={question.explanation} maxLength={3000} onChange={event => updateQuestion(index, "explanation", event.target.value)} /></label></div>)}<button className="button" type="button" onClick={() => setQuestions(previous => [...previous, { prompt: "", options: ["", "", "", ""], correct: 0, explanation: "" }])}><Icon name="plus" size={15} />Add question</button></div>}
      {collection === "faculty" && <p className="field-note">Imported faculty identities are sample profiles. Confirm approval before marking a profile as approved.</p>}{collection === "results" && <p className="field-note">SSB recommendation, written-exam clearance and final selection are different outcomes. Choose the precise result.</p>}{error && <p className="form-error" role="alert">{error}</p>}</div><div className="dialog-footer"><span><Icon name="shield" size={14} />Admin draft · not published</span><button type="button" className="button" onClick={close} disabled={busy}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}<Icon name="check" size={16} /></button></div></form></Dialog>;
}

export function EnquiryDialog({ item, save, close }) {
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); try { await save("enquiries", Object.fromEntries(new FormData(event.currentTarget)), item.id); close(); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <Dialog title={item.name} subtitle={`Enquiry ${item.id}`} close={() => { if (!busy) close(); }}><form onSubmit={submit}><div className="dialog-body"><div className="contact-details"><a href={`mailto:${item.email}`}>{item.email}</a><a href={`tel:${item.phone}`}>{item.phone}</a><span>{item.location}</span>{item.organisation && <span>{item.organisation}</span>}</div><div className="enquiry-message"><span className="eyebrow">{item.interest}</span><h3>{item.programme || "General enquiry"}</h3><p>{item.requirement}</p><small>Received {displayDate(item.createdAt)} · {item.queue} queue</small></div><label>Enquiry status<select name="status" defaultValue={item.status}>{["New", "In progress", "Resolved"].map(status => <option key={status}>{status}</option>)}</select></label><label>Internal notes<textarea name="notes" defaultValue={item.notes || ""} rows={4} maxLength={4000} placeholder="Add follow-up details for your team…" /></label>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="dialog-footer"><button type="button" className="button" onClick={close} disabled={busy}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Saving…" : "Save enquiry"}</button></div></form></Dialog>;
}

export function DeleteDialog({ collection, item, close, remove }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <Dialog title={`Delete ${singular[collection]}?`} close={() => { if (!busy) close(); }}><div className="dialog-body"><p className="delete-description">“{item.title || item.name}” will be removed from this admin workspace. This does not delete the public website’s source content.</p>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="dialog-footer"><button className="button" onClick={close} disabled={busy}>Keep record</button><button className="button destructive" disabled={busy} onClick={async () => { setBusy(true); try { await remove(collection, item); } catch (err) { setError(err.message); setBusy(false); } }}>{busy ? "Deleting…" : "Delete record"}</button></div></Dialog>;
}
