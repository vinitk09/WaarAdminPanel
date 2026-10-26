"use client";

import { useId, useState } from "react";
import { Badge, Dialog, Icon, displayDate, initials } from "./admin-ui";
import "./record-details.css";

const text = value => value || "Not provided";
const dateTime = value => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date) + " IST";
};
function Field({ label, children }) { return <div><dt>{label}</dt><dd>{children}</dd></div>; }
function Card({ title, icon = "file", children, className = "" }) {
  return <section className={`preview-card ${className}`}><h3><span><Icon name={icon} size={17} /></span>{title}</h3>{children}</section>;
}
function NoRecords({ icon, title, detail }) {
  return <div className="preview-empty"><span><Icon name={icon} size={24} /></span><h4>{title}</h4><p>{detail}</p></div>;
}
function ViewIcon({ label, title, onClick }) {
  return <button className="icon-button view-icon-button" title={title || label} aria-label={label} onClick={onClick}><Icon name="eye" size={18} /></button>;
}
function Curriculum({ course }) {
  return <div className="preview-curriculum">
    <Card title="Complete syllabus" icon="book">
      {course?.academicsSample && <p className="preview-info"><Icon name="info" size={15} />Imported syllabus and teaching profiles are illustrative website content.</p>}
      {course?.syllabus?.length ? <div className="preview-modules">{course.syllabus.map((module, index) => <article key={index}><span className="module-index">{String(index + 1).padStart(2, "0")}</span><div><h4>{module.title}</h4><ul>{module.topics.map((topic, topicIndex) => <li key={topicIndex}>{topic}</li>)}</ul></div></article>)}</div> : <NoRecords icon="book" title="A syllabus is yet to be added" detail="Course modules and their topics will appear here." />}
    </Card>
    <Card title="Course teaching team" icon="users">{course?.teachers?.length ? <div className="preview-faculty">{course.teachers.map((teacher, index) => <article key={index}><span className="avatar">{initials(teacher.name)}</span><div><h4>{teacher.name}</h4><span>{teacher.role}</span><p>{teacher.subjects?.join(" / ") || "Subjects not provided"}</p></div></article>)}</div> : <NoRecords icon="users" title="No course teachers assigned" detail="Teaching profiles will appear once they are added to this course." />}</Card>
  </div>;
}
function Learning({ lessons, tests }) {
  return <div className="preview-stack">
    <Card title="Course lessons" icon="folder">{lessons.length ? lessons.map(lesson => <details className="preview-disclosure" key={lesson.id}><summary><span className="disclosure-icon"><Icon name="file" size={18} /></span><span><strong>{lesson.title}</strong><small>{lesson.section || "No module assigned"}</small></span><Badge>{lesson.status}</Badge><Icon name="chevron" size={15} /></summary><div className="disclosure-content"><p>{text(lesson.body)}</p>{lesson.videoUrl && /^https:\/\//.test(lesson.videoUrl) && <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="text-button">Open video resource<Icon name="external" size={14} /></a>}</div></details>) : <NoRecords icon="folder" title="Learning starts here" detail="No lesson drafts have been added to this course yet." />}</Card>
    <Card title="Test series & answer keys" icon="file">{tests.length ? tests.map(test => <details className="preview-disclosure" key={test.id}><summary><span className="disclosure-icon"><Icon name="file" size={18} /></span><span><strong>{test.title}</strong><small>{test.duration} minutes &middot; {test.questions?.length || 0} questions</small></span><Badge>{test.status}</Badge><Icon name="chevron" size={15} /></summary><div className="disclosure-content">{test.questions?.map((question, index) => <article className="preview-question" key={question.id || index}><h4>{index + 1}. {question.prompt}</h4><ol>{question.options.map((option, optionIndex) => <li key={optionIndex} className={optionIndex === question.correct ? "correct-answer" : ""}>{option}{optionIndex === question.correct && <strong> (correct answer)</strong>}</li>)}</ol><p><strong>Explanation: </strong>{question.explanation || "Not provided"}</p></article>)}</div></details>) : <NoRecords icon="file" title="Room for a little practice" detail="No test drafts have been added to this course yet." />}</Card>
  </div>;
}

export default function RecordDetails({ collection, item, data, close, edit, view }) {
  const [activeTab, setActiveTab] = useState("overview");
  const panelId = useId();
  const isCourse = collection === "courses";
  const course = isCourse ? item : data.courses.find(record => record.slug === item.courseId);
  const batches = isCourse ? data.batches.filter(batch => batch.courseId === item.slug) : [];
  const lessons = data.lessons.filter(lesson => lesson.courseId === course?.slug);
  const tests = data.tests.filter(test => test.courseId === course?.slug);
  const enrolments = data.enrolments.filter(enrolment => enrolment.courseId === course?.slug && (isCourse || enrolment.batchId === item.id || (enrolment.batch && enrolment.batch === item.title)));
  const tabs = [{ id: "overview", label: "Overview", icon: "grid" }, { id: "curriculum", label: "Syllabus & faculty", icon: "book" }, { id: "learning", label: "Learning content", icon: "folder", count: lessons.length + tests.length }, { id: "learners", label: "Learners", icon: "users", count: enrolments.length }];
  const stats = isCourse ? [{ label: "Syllabus modules", value: course?.syllabus?.length || 0, icon: "book" }, { label: "Teaching team", value: course?.teachers?.length || 0, icon: "users" }, { label: "Linked batches", value: batches.length, icon: "calendar" }, { label: "Enrolments", value: enrolments.length, icon: "shield" }] : [{ label: "Starts on", value: item.startsAt ? displayDate(item.startsAt) : "To be planned", icon: "calendar" }, { label: "Capacity", value: item.capacity || "Not set", icon: "users" }, { label: "Matched learners", value: enrolments.length, icon: "shield" }];
  function changeTab(id) { setActiveTab(id); document.getElementById(panelId)?.scrollTo(0, 0); }
  function keyboardTabs(event, index) {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); changeTab(tabs[next].id); document.getElementById(`${panelId}-${tabs[next].id}`)?.focus(); }
  }
  return <Dialog title={item.title} subtitle={isCourse ? "Course overview & learning pathway" : "Batch overview & preparation schedule"} close={close} className="record-dialog" wide>
    <div className="preview-identity"><span className="preview-identity-icon"><Icon name={isCourse ? "book" : "calendar"} size={18} /></span><span>{isCourse ? text(item.category) : course?.title || text(item.courseId)}</span><i /><span>{isCourse ? item.short || "Course programme" : "Academy batch"}</span><Badge>{item.status}</Badge></div>
    <div className="preview-tabs" role="tablist" aria-label={isCourse ? "Course details" : "Batch details"}>{tabs.map((tab, index) => <button key={tab.id} id={`${panelId}-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={panelId} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => changeTab(tab.id)} onKeyDown={event => keyboardTabs(event, index)}><Icon name={tab.icon} size={16} /><span>{tab.label}</span>{tab.count !== undefined && <b>{tab.count}</b>}</button>)}</div>
    <div id={panelId} className="preview-scroll" role="tabpanel" aria-labelledby={`${panelId}-${activeTab}`} tabIndex={0}>
      {activeTab === "overview" && <>
        <div className={`preview-stats ${isCourse ? "" : "batch-stats"}`}>{stats.map(stat => <div key={stat.label}><span className="preview-stat-icon"><Icon name={stat.icon} size={17} /></span><div><strong>{stat.value}</strong><span>{stat.label}</span></div></div>)}</div>
        <div className="preview-columns"><div className="preview-stack">
          {isCourse ? <><Card title="Course overview" icon="book"><p>{text(item.description)}</p><div className="preview-audience"><span>WHO IS IT FOR?</span><p>{text(item.audience)}</p></div></Card><Card title="Learning focus" icon="shield">{item.focus?.length ? <ul className="preview-focus">{item.focus.map((focus, index) => <li key={index}><span><Icon name="check" size={13} /></span>{focus}</li>)}</ul> : <p className="preview-muted">No learning focus added yet.</p>}</Card></> : <>
            <Card title="Batch schedule" icon="calendar"><dl className="preview-facts"><Field label="Batch name">{item.title}</Field><Field label="Start date & time">{dateTime(item.startsAt)}</Field><Field label="Learner capacity">{item.capacity || "Not set"}</Field><Field label="Assigned faculty">{item.faculty || "Not assigned"}</Field><Field label="Matched enrolments">{enrolments.length}</Field></dl></Card>
            <Card title="Associated course" icon="book">{course ? <><div className="preview-related-title"><h4>{course.title}</h4><ViewIcon label="View course" title={`View ${course.title}`} onClick={() => view("courses", course)} /></div><p>{text(course.description)}</p></> : <p className="preview-muted">The linked course is not available.</p>}</Card>
          </>}
        </div><aside className="preview-stack"><Card title={isCourse ? "Programme details" : "Batch details"} icon="info"><dl className="preview-facts">{isCourse ? <><Field label="Course name">{item.title}</Field><Field label="Short name">{text(item.short)}</Field><Field label="Category">{text(item.category)}</Field><Field label="Website path"><span className="preview-path">/courses/{item.slug}</span></Field><Field label="Availability">{text(item.availability)}</Field><Field label="Enquiry interest">{text(item.interest)}</Field></> : <><Field label="Course">{course?.title || text(item.courseId)}</Field><Field label="Status"><Badge>{item.status}</Badge></Field></>}<Field label="Last updated">{item.updatedAt ? dateTime(item.updatedAt) : "Imported website record"}</Field></dl></Card><div className="preview-draft-note"><Icon name="shield" size={18} /><div><strong>Academy workspace</strong><p>These are saved admin details. Content drafts are not yet published to the public website.</p></div></div></aside></div>
        {isCourse && <Card title="Batches & schedule" icon="calendar" className="preview-batches">{batches.length ? batches.map(batch => <div className="preview-batch-row" key={batch.id}><span className="preview-batch-icon"><Icon name="calendar" size={20} /></span><div><h4>{batch.title}</h4><p>{dateTime(batch.startsAt)} &middot; {batch.faculty || "Faculty not assigned"}</p><small>Capacity: {batch.capacity || "Not set"}</small></div><Badge>{batch.status}</Badge><ViewIcon label="View batch" title={`View ${batch.title}`} onClick={() => view("batches", batch)} /></div>) : <NoRecords icon="calendar" title="Your next batch starts with a plan" detail="No batches have been linked to this course yet." />}</Card>}
      </>}
      {activeTab === "curriculum" && <Curriculum course={course} />}
      {activeTab === "learning" && <Learning lessons={lessons} tests={tests} />}
      {activeTab === "learners" && <Card title={isCourse ? "Enrolled learners" : "Learners matched to this batch"} icon="users">{enrolments.length ? <div className="preview-learners">{enrolments.map(enrolment => <article key={enrolment.id}><span className="avatar">{initials(enrolment.name)}</span><div><h4>{text(enrolment.name)}</h4><span>{text(enrolment.email)}</span><small>Batch: {enrolment.batch || "Not assigned"} &middot; Access until: {enrolment.accessEnd ? displayDate(enrolment.accessEnd) : "Not provided"}</small></div><Badge>{enrolment.status}</Badge></article>)}</div> : <NoRecords icon="users" title="Ready for the next learner" detail={isCourse ? "No website enrolments were found for this course." : "No website enrolments currently match this batch's exact name or ID."} />}</Card>}
    </div>
    <div className="dialog-footer preview-footer"><span><Icon name="eye" size={15} />Read-only preview</span><button className="button" onClick={close}>Close</button><button className="button primary" onClick={() => edit(collection, item)}><Icon name="edit" size={15} />Edit {isCourse ? "course" : "batch"}</button></div>
  </Dialog>;
}
