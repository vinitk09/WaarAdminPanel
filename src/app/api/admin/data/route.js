import { randomUUID } from "node:crypto";
import { currentAdmin, sameOrigin } from "@/lib/admin-auth";
import { dashboardData, saveRecord, mutateStore, recordChanges } from "@/lib/admin-store";

const json = (value, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  if (!(await currentAdmin())) return json({ error: "Sign in to continue." }, 401);
  try { return json(await dashboardData()); }
  catch { return json({ error: "Workspace data could not be read. Check the server logs and data files." }, 500); }
}
export async function POST(request) {
  const user = await currentAdmin();
  if (!user) return json({ error: "Sign in to continue." }, 401);
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  const text = await request.text();
  if (text.length > 200000) return json({ error: "Record is too large." }, 413);
  let input; try { input = JSON.parse(text); } catch { return json({ error: "Invalid request." }, 400); }
  try {
    if (input.collection === "settings") {
      const record = input.record;
      if (!record || typeof record.websiteUrl !== "string" || !/^https?:\/\//.test(record.websiteUrl) || record.websiteUrl.length > 2000 || ![record.academyName, record.contactEmail, record.contactPhone].every(value => typeof value === "string" && value.length <= 200) || !record.academyName.trim() || (record.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.contactEmail))) throw new Error("Check the website URL and contact details.");
      await mutateStore(store => { const before = store.settings; store.settings = { websiteUrl: record.websiteUrl, academyName: record.academyName, contactEmail: record.contactEmail, contactPhone: record.contactPhone }; return { message: "Updated workspace settings", audit: { action: "Updated", collection: "settings", recordId: "settings", recordTitle: "Workspace settings", changes: recordChanges(before, store.settings) } }; }, user.email);
    } else if (input.collection === "enquiries") {
      if (!["New", "In progress", "Resolved"].includes(input.record?.status) || typeof input.record?.notes !== "string" || input.record.notes.length > 4000) throw new Error("Check enquiry status and notes.");
      const data = await dashboardData();
      if (!data.enquiries.some(item => item.id === input.id)) throw new Error("Enquiry not found.");
      await mutateStore(store => { const previous = store.enquiryUpdates[input.id] || { status: "New", notes: "" }; const after = { status: input.record.status, notes: input.record.notes }; store.enquiryUpdates[input.id] = { ...after, updatedAt: new Date().toISOString() }; return { message: `Updated enquiry ${input.id}`, audit: { action: "Updated", collection: "enquiries", recordId: input.id, recordTitle: `Enquiry ${input.id}`, changes: recordChanges({ status: previous.status, notes: previous.notes || "" }, after) } }; }, user.email);
    } else if (input.action === "delete") {
      if (!["courses", "faculty", "results", "projects", "batches", "lessons", "tests", "pages"].includes(input.collection)) throw new Error("This collection is read-only.");
      await mutateStore(store => {
        const existing = store[input.collection].find(item => item.id === input.id);
        if (!existing) throw new Error("Record not found.");
        if (input.collection === "faculty" && store.courses.some(course => Array.isArray(course.facultyIds) ? course.facultyIds.includes(existing.id) : course.teachers?.some(teacher => teacher.name === existing.name))) throw new Error("Unassign this faculty member from their courses before deleting the profile.");
        if (input.collection === "courses" && ["batches", "lessons", "tests"].some(key => store[key].some(item => item.courseId === existing.slug))) throw new Error("Remove this course’s batches, lessons and tests before deleting it.");
        store[input.collection] = store[input.collection].filter(item => item.id !== input.id);
        return { message: `Deleted ${existing.title || existing.name}`, audit: { action: "Deleted", collection: input.collection, recordId: existing.id, recordTitle: existing.title || existing.name, changes: recordChanges(Object.fromEntries(["title", "name", "slug", "status", "courseId"].filter(key => existing[key] !== undefined).map(key => [key, existing[key]])), {}) } };
      }, user.email);
    } else await saveRecord(input.collection, input.id, input.record, user.email);
    return json({ ok: true, requestId: randomUUID() });
  } catch (error) { return json({ error: ["EACCES", "EPERM", "ENOSPC"].includes(error.code) ? "Could not save workspace data. Check server storage permissions." : error.message }, 400); }
}
