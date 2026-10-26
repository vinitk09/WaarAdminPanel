import "server-only";
import { readFile, readdir, writeFile, mkdir, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { courses } from "@/data/site-reference/courses";
import { faculty } from "@/data/site-reference/faculty";
import { projects } from "@/data/site-reference/projects";
import { studentResults } from "@/data/site-reference/student-results";
import { upcomingBatches } from "@/data/site-reference/home-defence";
import websitePages from "@/data/site-reference/pages.json";

const directory = path.resolve(/* turbopackIgnore: true */ process.env.WAARR_ADMIN_DATA_PATH || path.join(process.cwd(), ".data"));
const storePath = path.join(directory, "admin.json");
// The sibling website is runtime data, never a server bundle dependency.
const websiteRoot = path.resolve(/* turbopackIgnore: true */ process.env.WAARR_WEBSITE_PATH || path.join(process.cwd(), "..", "..", "Waar"));
let queue = Promise.resolve();

const seed = () => ({
  courses: courses.map(item => ({ ...item, id: item.slug, status: "Imported", image: item.category === "Defence" ? "/images/defence.png" : "/images/sports.png" })),
  pages: websitePages.map(item => ({ ...item })),
  faculty: faculty.map(item => ({ ...item, id: item.slug, status: "Sample profile" })),
  results: studentResults.map(item => ({ ...item, status: "Imported" })),
  projects: projects.map(item => ({ ...item, id: item.slug, title: item.name, status: "Needs verification" })),
  batches: upcomingBatches.map(item => ({ id: item.slug, courseId: item.slug, title: item.title, startsAt: "", capacity: 0, status: "Unscheduled", faculty: "" })),
  lessons: [], tests: [], enquiryUpdates: {},
  settings: { websiteUrl: "http://localhost:3000", academyName: "WAARR Defence Academy", contactEmail: "", contactPhone: "" },
  activity: [], audit: [],
});

export async function readStore() {
  try { const saved = JSON.parse(await readFile(storePath, "utf8")); const defaults = seed(); return { ...defaults, ...saved, audit: saved.audit ?? (saved.activity || []).map(event => ({ ...event, action: "Historical activity", collection: "workspace", recordTitle: event.title, changes: [] })), settings: { ...defaults.settings, ...saved.settings } }; }
  catch (error) { if (error.code === "ENOENT") return seed(); throw error; }
}

async function websiteData() {
  let lms = {}; let enquiries = []; const issues = [];
  try { lms = JSON.parse(await readFile(path.join(websiteRoot, ".data", "lms.json"), "utf8")); }
  catch (error) { issues.push(error.code === "ENOENT" ? "No learner store found" : "Learner store could not be read"); }
  try {
    const folder = path.join(websiteRoot, ".data", "enquiries");
    const files = (await readdir(folder)).filter(name => name.endsWith(".json"));
    enquiries = await Promise.all(files.map(async name => {
      const item = JSON.parse(await readFile(path.join(folder, name), "utf8"));
      return { id: item.reference || name.replace(".json", ""), name: item.name, email: item.email, phone: item.phone, location: item.location, requirement: item.requirement, interest: item.interest, programme: item.programme, organisation: item.organisation, queue: item.queue, createdAt: item.createdAt, status: "New" };
    }));
  } catch (error) { issues.push(error.code === "ENOENT" ? "No enquiries received yet" : "Enquiries could not be read"); }
  // Explicitly allowlist learner fields. Password hashes and session tokens never leave the server.
  const students = (lms.users || []).filter(user => !user.demo).map(user => ({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt || null, status: "Registered" }));
  const users = new Map(students.map(user => [user.id, user]));
  const enrolments = (lms.enrolments || []).filter(item => users.has(item.userId)).map(item => {
    const registration = (lms.registrations || []).find(record => record.id === item.registrationId && record.userId === item.userId && record.courseId === item.courseId && record.status === "submitted");
    const payment = (lms.payments || []).find(record => record.id === item.paymentId && record.registrationId === item.registrationId && record.userId === item.userId && record.courseId === item.courseId);
    let accessState = "Pending verification";
    if (item.status !== "active") accessState = item.status || "Unknown";
    else if (Number.isFinite(item.accessEnd) && item.accessEnd <= Date.now()) accessState = "Expired";
    else if (Number.isFinite(item.start) && item.start > Date.now()) accessState = "Upcoming";
    else if (registration && Number.isFinite(item.start) && Number.isFinite(item.accessEnd) && item.start <= Date.now() && item.accessEnd > Date.now()) {
      if (payment?.mode === "live" && payment.status === "verified") accessState = "Active";
      else if (payment?.mode === "demo" && payment.status === "completed") accessState = "Demo access";
    }
    return { id: item.id, userId: item.userId, name: users.get(item.userId).name, email: users.get(item.userId).email, courseId: item.courseId, batch: item.batch, batchId: item.batchId, status: item.status, accessState, paymentMode: payment?.mode || "Not linked", paymentStatus: payment?.status || "Not linked", accessEnd: item.accessEnd, start: item.start };
  });
  const payments = (lms.payments || []).filter(item => users.has(item.userId)).map(item => ({ id: item.id, name: users.get(item.userId).name, courseId: item.courseId, amount: item.amount, status: item.status, mode: item.mode, paidAt: item.paidAt }));
  const registrations = (lms.registrations || []).filter(item => users.has(item.userId)).map(item => {
    const matches = (lms.payments || []).filter(payment => payment.registrationId === item.id && payment.userId === item.userId && payment.courseId === item.courseId);
    const payment = matches.find(payment => payment.mode === "live" && payment.status === "verified") || matches.find(payment => payment.mode === "demo" && payment.status === "completed") || matches.at(-1);
    return { id: item.id, userId: item.userId, name: item.name || users.get(item.userId).name, email: item.email || users.get(item.userId).email, phone: item.phone, location: item.location, courseId: item.courseId, status: item.status, submittedAt: item.submittedAt, paymentMode: payment?.mode || "No payment", paymentStatus: payment ? (payment.mode === "demo" ? "Demo payment" : payment.status === "verified" ? "Verified payment" : payment.status) : "Awaiting payment" };
  });
  const attempts = (lms.testAttempts || []).filter(item => users.has(item.userId)).map(item => ({ id: item.id, name: users.get(item.userId).name, courseId: item.courseId, title: item.title, submittedAt: item.submittedAt, score: item.score, sample: item.sample }));
  return { students, enrolments, payments, registrations, attempts, enquiries, issues };
}

export async function dashboardData() {
  const [store, website] = await Promise.all([readStore(), websiteData()]);
  const linkedCourses = store.courses.map(course => Array.isArray(course.facultyIds) ? { ...course, teachers: course.facultyIds.map(id => store.faculty.find(member => member.id === id)).filter(Boolean).map(member => ({ id: member.id, name: member.name, role: member.role, subjects: member.subjects, sample: member.sample, status: member.status })) } : course);
  const linkedFaculty = store.faculty.map(member => ({ ...member, courses: linkedCourses.filter(course => Array.isArray(course.facultyIds) ? course.facultyIds.includes(member.id) : course.teachers?.some(teacher => teacher.name === member.name)).map(course => ({ slug: course.slug, title: course.title })) }));
  return { ...store, ...website, courses: linkedCourses, faculty: linkedFaculty, enquiries: website.enquiries.map(item => ({ ...item, ...store.enquiryUpdates[item.id] })), connection: { mode: "Local website", content: "Imported snapshot", checkedAt: new Date().toISOString(), issues: website.issues } };
}

const schemas = {
  courses: { title: 120, slug: 120, category: 80, short: 40, description: 4000, audience: 1000, availability: 150, status: 50, focus: "list", syllabus: "syllabus", facultyIds: "references" },
  faculty: { name: 100, slug: 120, role: 150, subjects: "list", introduction: 3000, status: 50 },
  results: { name: 100, exam: 50, outcome: 100, month: 30, year: "year", status: 50 },
  projects: { title: 150, slug: 120, area: 150, category: 80, status: 50 },
  pages: { title: 150, slug: 120, pathname: 250, heroTitle: 300, seoTitle: 200, seoDescription: 1000, body: 12000, status: 50 },
  batches: { title: 150, courseId: 120, startsAt: 40, capacity: "capacity", faculty: 120, status: 50 },
  lessons: { title: 150, courseId: 120, section: 150, body: 12000, videoUrl: "url", status: 50 },
  tests: { title: 150, courseId: 120, duration: "duration", questions: "questions", status: 50 },
};
export function validateRecord(collection, input) {
  const schema = schemas[collection];
  if (!schema || !input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid record.");
  const record = {};
  for (const [key, rule] of Object.entries(schema)) {
    if (rule === "references") {
      if (input[key] === undefined) continue;
      if (!Array.isArray(input[key]) || input[key].length > 30 || input[key].some(id => typeof id !== "string" || !id || id.length > 150) || new Set(input[key]).size !== input[key].length) throw new Error("Choose valid faculty members without duplicates.");
      record[key] = input[key];
      continue;
    }
    const value = input[key] ?? "";
    if (rule === "list") { if (!Array.isArray(value) || value.length > 30 || value.some(item => typeof item !== "string" || item.length > 250)) throw new Error(`Check ${key}.`); record[key] = value; }
    else if (["year", "capacity", "duration"].includes(rule)) { const number = Number(value); const min = rule === "year" ? 1900 : 0; const max = rule === "year" ? 2200 : rule === "duration" ? 600 : 10000; if (!Number.isInteger(number) || number < min || number > max) throw new Error(`Check ${key}.`); record[key] = number; }
    else if (rule === "syllabus") {
      if (!Array.isArray(value) || value.length > 50) throw new Error("Use up to 50 syllabus modules.");
      record.syllabus = value.map(module => {
        if (typeof module.title !== "string" || !module.title.trim() || module.title.length > 200 || !Array.isArray(module.topics) || module.topics.length > 50 || module.topics.some(topic => typeof topic !== "string" || !topic.trim() || topic.length > 500)) throw new Error("Check the module titles and topics.");
        return { title: module.title.trim(), topics: module.topics.map(topic => topic.trim()) };
      });
    } else if (rule === "questions") {
      if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error("Add between 1 and 100 questions.");
      record.questions = value.map((question, index) => {
        if (typeof question.prompt !== "string" || !question.prompt.trim() || question.prompt.length > 2000 || !Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6 || question.options.some(option => typeof option !== "string" || !option.trim() || option.length > 1000) || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length || typeof question.explanation !== "string" || question.explanation.length > 3000) throw new Error(`Check question ${index + 1}, its options, and correct answer.`);
        return { id: `q-${index + 1}`, prompt: question.prompt, options: question.options, correct: question.correct, explanation: question.explanation };
      });
    } else if (rule === "url") {
      if (typeof value !== "string" || value.length > 2000 || (value && !/^https:\/\//.test(value))) throw new Error("Use an HTTPS video URL."); record[key] = value;
    } else { if (typeof value !== "string" || value.length > rule) throw new Error(`Check ${key}.`); record[key] = value.trim(); }
  }
  const title = collection === "faculty" || collection === "results" ? record.name : record.title;
  if (!title) throw new Error("A name or title is required.");
  if ("slug" in record && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug)) throw new Error("Use a lowercase slug with words separated by hyphens.");
  if (record.startsAt && !Number.isFinite(Date.parse(record.startsAt))) throw new Error("Choose a valid batch date.");
  if (collection === "pages" && !/^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(record.pathname)) throw new Error("Use a website path such as /about or /solutions/education.");
  if (record.status && !["Imported", "Draft", "Ready for review", "Archived", "Sample profile", "Approved", "Needs verification", "Unscheduled", "Scheduled", "Completed", "Cancelled"].includes(record.status)) throw new Error("Choose a supported status.");
  return record;
}

export function recordChanges(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field])).map(field => ({ field, before: before[field] ?? null, after: after[field] ?? null }));
}

export async function mutateStore(operation, actor) {
  const task = queue.then(async () => {
    const store = await readStore();
    const result = await operation(store);
    const event = { id: randomUUID(), title: result.message, actor, at: new Date().toISOString(), action: "Updated", collection: "workspace", recordTitle: result.message, changes: [], ...result.audit };
    store.audit.unshift(event);
    store.activity.unshift(event);
    store.activity = store.activity.slice(0, 100);
    await mkdir(directory, { recursive: true });
    const temporary = `${storePath}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(store, null, 2), { mode: 0o600 });
    await rename(temporary, storePath);
    return result;
  });
  queue = task.catch(() => {});
  return task;
}

export async function saveRecord(collection, id, input, actor) {
  const record = validateRecord(collection, input);
  return mutateStore(store => {
    if (record.facultyIds && record.facultyIds.some(id => !store.faculty.some(member => member.id === id))) throw new Error("A selected faculty member no longer exists. Refresh and choose again.");
    if (record.courseId && !store.courses.some(course => course.slug === record.courseId)) throw new Error("Choose an existing course.");
    if (record.slug && store[collection].some(item => item.slug === record.slug && item.id !== id)) throw new Error("That slug is already in use.");
    const index = id ? store[collection].findIndex(item => item.id === id) : -1;
    if (id && index < 0) throw new Error("Record not found.");
    if (collection === "batches" && record.status === "Scheduled" && !record.startsAt) throw new Error("Scheduled batches need a start date.");
    if (collection === "courses" && index >= 0 && store.courses[index].slug !== record.slug && ["batches", "lessons", "tests"].some(key => store[key].some(item => item.courseId === store.courses[index].slug))) throw new Error("The course slug is used by batches, lessons or tests. Keep it unchanged.");
    const existingRecord = index >= 0 ? store[collection][index] : {};
    const saved = { ...existingRecord, ...record, id: id || randomUUID(), updatedAt: new Date().toISOString() };
    if (collection === "projects") saved.name = saved.title;
    if (collection === "courses" && !saved.image) saved.image = saved.category === "Defence" ? "/images/defence.png" : "/images/sports.png";
    if (index >= 0) store[collection][index] = saved; else store[collection].unshift(saved);
    const before = Object.fromEntries(Object.keys(record).map(key => [key, existingRecord[key]]));
    return { message: `${index >= 0 ? "Updated" : "Created"} ${record.title || record.name}`, record: saved, audit: { action: index >= 0 ? "Updated" : "Created", collection, recordId: saved.id, recordTitle: saved.title || saved.name, changes: recordChanges(before, record) } };
  }, actor);
}
