import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

await test("WAARR administrator integration", async suite => {
const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(path.join(tmpdir(), "waarr-admin-test-"));
const website = path.join(temporary, "website");
await mkdir(path.join(website, ".data", "enquiries"), { recursive: true });
await writeFile(path.join(website, ".data", "lms.json"), JSON.stringify({
  users: [{ id: "learner-1", name: "Test learner", email: "learner@example.test", passwordHash: "DO_NOT_EXPOSE_HASH", salt: "DO_NOT_EXPOSE_SALT" }, { id: "demo-1", name: "Demo account", demo: true }],
  sessions: [{ hash: "DO_NOT_EXPOSE_SESSION" }],
  registrations: [{ id: "registration-1", userId: "learner-1", courseId: "nda", name: "Test learner", email: "learner@example.test", phone: "9999999999", location: "Test city", status: "submitted", submittedAt: new Date().toISOString() }],
  enrolments: [{ id: "enrolment-1", userId: "learner-1", courseId: "nda", registrationId: "registration-1", paymentId: "payment-1", batch: "Test batch", status: "active", start: Date.now() - 10000, accessEnd: Date.now() + 86400000 }],
  payments: [{ id: "payment-1", userId: "learner-1", courseId: "nda", registrationId: "registration-1", amount: 0, mode: "demo", status: "completed" }],
}));
await writeFile(path.join(website, ".data", "enquiries", "test.json"), JSON.stringify({ reference: "WAARR-TEST", name: "Test enquiry", email: "contact@example.test", phone: "9999999999", interest: "Defence Preparation", queue: "defence", requirement: "Please share the next NDA batch details.", createdAt: new Date().toISOString() }));
const password = randomBytes(24).toString("hex");
const email = "qa@example.test";
const port = process.env.WAARR_TEST_PORT || "3101";
const base = `http://localhost:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], { cwd, env: { ...process.env, WAARR_ADMIN_PASSWORD: password, WAARR_ADMIN_EMAIL: email, WAARR_ADMIN_SESSION_SECRET: randomBytes(32).toString("hex"), WAARR_WEBSITE_PATH: website, WAARR_ADMIN_DATA_PATH: path.join(temporary, "admin") }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let output = ""; server.stdout.on("data", value => { output += value; }); server.stderr.on("data", value => { output += value; });
suite.after(async () => {
  if (server.exitCode === null) { if (process.platform === "win32") { try { execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true, timeout: 5000 }); } catch { server.kill(); } } else server.kill("SIGTERM"); }
  server.stdout.destroy(); server.stderr.destroy(); server.unref();
  assert.equal(path.dirname(temporary), path.resolve(tmpdir()));
  assert.ok(path.basename(temporary).startsWith("waarr-admin-test-"));
  await rm(temporary, { recursive: true, force: true });
});
for (let attempt = 0; attempt < 80; attempt++) {
  try { if ((await fetch(`${base}/api/admin/auth`)).ok) break; } catch {}
  if (server.exitCode !== null) throw new Error(`Test server exited: ${output}`);
  if (attempt === 79) throw new Error(`Test server did not become ready: ${output}`);
  await new Promise(resolve => setTimeout(resolve, 500));
}
let cookie;
const request = (method, body, origin = base) => fetch(`${base}/api/admin/data`, { method, headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

await suite.test("private data requires administrator authentication", async () => {
  assert.equal((await request("GET")).status, 401);
  const state = await (await fetch(`${base}/api/admin/auth`)).json();
  assert.equal(state.demoLogin, null);
  assert.equal(state.setupRequired, undefined);
  const setup = await fetch(`${base}/api/admin/auth`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup", email, password }) });
  assert.equal(setup.status, 403);
  const invalid = await fetch(`${base}/api/admin/auth`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ email, password: "wrong-password" }) });
  assert.equal(invalid.status, 401);
  const login = await fetch(`${base}/api/admin/auth`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(login.headers.get("set-cookie"), /SameSite=strict/i);
  cookie = login.headers.get("set-cookie").split(";")[0];
});

await suite.test("website records are allowlisted and sample identities stay separate", async () => {
  const response = await request("GET"); const raw = await response.text(); const data = JSON.parse(raw);
  assert.equal(response.status, 200); assert.equal(data.courses.length, 9); assert.equal(data.faculty.length, 6); assert.equal(data.results.length, 5); assert.equal(data.pages.length, 9);
  assert.equal(data.students.length, 1); assert.equal(data.enrolments.length, 1); assert.equal(data.payments[0].mode, "demo"); assert.equal(data.enquiries.length, 1);
  assert.equal(data.registrations.length, 1); assert.equal(data.registrations[0].paymentStatus, "Demo payment"); assert.equal(data.enrolments[0].accessState, "Demo access");
  for (const secret of ["DO_NOT_EXPOSE_HASH", "DO_NOT_EXPOSE_SALT", "DO_NOT_EXPOSE_SESSION", "passwordHash", '"sessions"']) assert.equal(raw.includes(secret), false);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

await suite.test("registrations distinguish verified, demo, expired and pending course access", async () => {
  const filename = path.join(website, ".data", "lms.json");
  const lms = JSON.parse(await readFile(filename, "utf8"));
  const now = Date.now();
  for (const [key, courseId, start, accessEnd, mode, status] of [["live", "cds", now - 10000, now + 86400000, "live", "verified"], ["expired", "ssb", now - 86400000, now - 1000, "live", "verified"], ["pending", "afcat", now - 10000, now + 86400000, "live", "completed"]]) {
    const registrationId = `registration-${key}`; const paymentId = `payment-${key}`;
    lms.registrations.push({ id: registrationId, userId: "learner-1", courseId, status: "submitted", submittedAt: new Date().toISOString() });
    lms.payments.push({ id: paymentId, registrationId, userId: "learner-1", courseId, mode, status, amount: 100 });
    lms.enrolments.push({ id: `enrolment-${key}`, registrationId, paymentId, userId: "learner-1", courseId, status: "active", start, accessEnd });
  }
  await writeFile(filename, JSON.stringify(lms));
  const data = await (await request("GET")).json();
  assert.equal(data.registrations.length, 4);
  assert.equal(data.enrolments.find(item => item.id === "enrolment-live").accessState, "Active");
  assert.equal(data.enrolments.find(item => item.id === "enrolment-expired").accessState, "Expired");
  assert.equal(data.enrolments.find(item => item.id === "enrolment-pending").accessState, "Pending verification");
  assert.equal(data.enrolments.filter(item => item.accessState === "Active").length, 1);
  assert.equal(data.registrations.find(item => item.id === "registration-live").paymentStatus, "Verified payment");
});

await suite.test("origin checks accept the requested host and reject foreign origins", async () => {
  for (const hostname of ["localhost", "127.0.0.1"]) {
    const origin = `http://${hostname}:${port}`;
    const response = await fetch(`${origin}/api/admin/auth`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 400, `Same-origin request to ${hostname} reaches input validation`);
  }
  for (const origin of ["https://other.example", `http://localhost:${Number(port) + 1}`, "null", null]) {
    const response = await fetch(`${base}/api/admin/auth`, {
      method: "POST",
      headers: { ...(origin ? { Origin: origin } : {}), "Content-Type": "application/json", "X-Forwarded-Host": "other.example" },
      body: "{}",
    });
    assert.equal(response.status, 403);
  }
});

await suite.test("cross-origin writes and invalid records are rejected", async () => {
  assert.equal((await request("POST", { collection: "settings", record: {} }, "https://other.example")).status, 403);
  assert.equal((await request("POST", { collection: "tests", record: { title: "Invalid", duration: 30, courseId: "nda", status: "Draft", questions: [{ prompt: "Question", options: ["A", "B"], correct: 5, explanation: "" }] } })).status, 400);
  assert.equal((await request("POST", { collection: "batches", record: { title: "No date", courseId: "nda", status: "Scheduled", startsAt: "", capacity: 10, faculty: "" } })).status, 400);
  assert.equal((await request("POST", { collection: "students", id: "learner-1", action: "delete" })).status, 400);
});

await suite.test("course syllabus edits and enquiry notes persist without changing the website", async () => {
  const data = await (await request("GET")).json();
  const course = data.courses.find(item => item.slug === "nda");
  course.title = "NDA Preparation — QA draft";
  course.syllabus[0].title = "Updated foundations";
  assert.equal((await request("POST", { collection: "courses", id: course.id, record: course })).status, 200);
  assert.equal((await request("POST", { collection: "enquiries", id: "WAARR-TEST", record: { status: "In progress", notes: "Follow up tomorrow" } })).status, 200);
  const updated = await (await request("GET")).json();
  assert.equal(updated.courses.find(item => item.slug === "nda").syllabus[0].title, "Updated foundations");
  assert.equal(updated.enquiries[0].notes, "Follow up tomorrow");
  assert.equal(updated.activity.length, 2);
  assert.equal(updated.audit.length, 2);
  const audit = updated.audit.find(event => event.collection === "courses");
  assert.equal(audit.actor, email); assert.equal(audit.action, "Updated"); assert.equal(audit.recordId, "nda");
  assert.equal(audit.changes.find(change => change.field === "title").before, "NDA Preparation");
  assert.equal(audit.changes.find(change => change.field === "title").after, course.title);
  assert.ok(updated.audit.find(event => event.collection === "enquiries").changes.some(change => change.field === "notes" && change.after === "Follow up tomorrow"));
  assert.equal((await request("POST", { collection: "audit", id: audit.id, action: "delete" })).status, 400);
  const disk = JSON.parse(await readFile(path.join(temporary, "admin", "admin.json"), "utf8"));
  assert.equal(disk.courses.find(item => item.slug === "nda").title, course.title);
  const original = JSON.parse(await readFile(path.join(website, ".data", "enquiries", "test.json"), "utf8"));
  assert.equal(original.notes, undefined);
});

await suite.test("faculty assignments are validated, retained and refreshed from profiles", async () => {
  const data = await (await request("GET")).json();
  const course = data.courses.find(item => item.slug === "cds");
  const selected = data.faculty.filter(item => ["arjun-sharma", "priya-nair"].includes(item.id));
  assert.equal((await request("POST", { collection: "courses", id: course.id, record: { ...course, facultyIds: ["missing-faculty"] } })).status, 400);
  assert.equal((await request("POST", { collection: "courses", id: course.id, record: { ...course, facultyIds: [selected[0].id, selected[0].id] } })).status, 400);
  assert.equal((await request("POST", { collection: "courses", id: course.id, record: { ...course, facultyIds: selected.map(member => member.id) } })).status, 200);
  let updated = await (await request("GET")).json();
  assert.deepEqual(updated.courses.find(item => item.id === course.id).teachers.map(member => member.id), selected.map(member => member.id));
  assert.ok(updated.faculty.find(item => item.id === selected[0].id).courses.some(item => item.slug === course.slug));
  assert.equal((await request("POST", { collection: "faculty", id: selected[0].id, action: "delete" })).status, 400);
  assert.equal((await request("POST", { collection: "faculty", id: selected[0].id, record: { ...selected[0], role: "Updated teaching role" } })).status, 200);
  updated = await (await request("GET")).json();
  assert.equal(updated.courses.find(item => item.id === course.id).teachers.find(member => member.id === selected[0].id).role, "Updated teaching role");
  const assignedCourse = updated.courses.find(item => item.id === course.id);
  assert.equal((await request("POST", { collection: "courses", id: course.id, record: { ...assignedCourse, facultyIds: [] } })).status, 200);
  assert.deepEqual((await (await request("GET")).json()).courses.find(item => item.id === course.id).teachers, []);
});

await suite.test("draft creation, reference protection and deletion work", async () => {
  const response = await request("POST", { collection: "tests", record: { title: "QA practice", courseId: "nda", duration: 15, status: "Draft", questions: [{ prompt: "Two plus two?", options: ["Three", "Four"], correct: 1, explanation: "2 + 2 = 4" }] } });
  assert.equal(response.status, 200);
  const data = await (await request("GET")).json(); const item = data.tests.find(item => item.title === "QA practice"); assert.equal(item.questions[0].correct, 1);
  assert.equal((await request("POST", { collection: "courses", id: "nda", action: "delete" })).status, 400);
  assert.equal((await request("POST", { collection: "tests", id: item.id, action: "delete" })).status, 200);
  assert.equal((await (await request("GET")).json()).tests.length, 0);
});

if (process.env.WAARR_PLAYWRIGHT_MODULE && process.env.WAARR_BROWSER_EXECUTABLE) {
  await suite.test("desktop and mobile browser flows", async () => {
    const { chromium } = await import(pathToFileURL(process.env.WAARR_PLAYWRIGHT_MODULE));
    const browser = await chromium.launch({ executablePath: process.env.WAARR_BROWSER_EXECUTABLE, headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
      const page = await context.newPage(); const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base); await page.getByLabel("Email address").fill(email); await page.getByLabel("Password", { exact: true }).fill(password); await page.getByRole("button", { name: "Sign in to workspace" }).click();
      await page.getByRole("heading", { name: "Your academy, at a glance." }).waitFor();
      await page.getByRole("searchbox", { name: "Search dashboard programmes", exact: true }).fill("NCC entry");
      await page.getByRole("button", { name: "View NCC Entry Guidance", exact: true }).waitFor();
      await page.getByRole("button", { name: "Clear search dashboard programmes", exact: true }).click();
      await page.screenshot({ path: path.join(temporary, "desktop.png"), fullPage: true });
      if (process.env.WAARR_QA_ARTIFACTS) { await mkdir(process.env.WAARR_QA_ARTIFACTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.WAARR_QA_ARTIFACTS, "admin-desktop.png"), fullPage: true }); }
      await page.getByRole("button", { name: "Courses & programmes", exact: true }).click();
      const courseSearch = page.getByRole("searchbox", { name: "Search courses & programmes", exact: true });
      await courseSearch.fill("ncc entry");
      await page.getByRole("button", { name: "View NCC Entry Guidance", exact: true }).waitFor();
      assert.equal(await page.locator(".data-table tbody tr").count(), 1);
      await courseSearch.fill("no-such-programme-qa");
      await page.getByRole("heading", { name: "No matching records", exact: true }).waitFor();
      await page.getByRole("button", { name: "Clear search courses & programmes", exact: true }).click();
      await page.locator(".data-table tbody tr").first().getByRole("button", { name: /^View / }).click();
      let details = page.getByRole("dialog");
      assert.equal(await details.evaluate(element => getComputedStyle(element).display), "flex");
      await details.getByRole("tab", { name: "Syllabus & faculty", exact: true }).click();
      await details.getByRole("heading", { name: "Complete syllabus", exact: true }).waitFor();
      assert.equal(await details.locator("input, textarea, select").count(), 0);
      await details.getByRole("heading", { name: /Updated foundations/ }).waitFor();
      await details.getByRole("tab", { name: /^Learners/ }).click();
      await details.getByText("Test learner", { exact: true }).waitFor();
      await details.getByRole("tab", { name: "Overview", exact: true }).click();
      await details.getByRole("button", { name: "View batch", exact: true }).first().click();
      await page.getByRole("dialog").getByRole("heading", { name: "Associated course", exact: true }).waitFor();
      await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: "Batches & schedule", exact: true }).click();
      await page.locator(".data-table tbody tr").first().getByRole("button", { name: /^View / }).click();
      details = page.getByRole("dialog");
      await details.getByText("Start date & time", { exact: true }).waitFor();
      await details.getByText("Learner capacity", { exact: true }).waitFor();
      assert.equal(await details.locator("input, textarea, select").count(), 0);
      await details.getByRole("button", { name: "Edit batch", exact: true }).click();
      await page.getByRole("dialog").getByLabel("Batch name").waitFor();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.getByRole("button", { name: "Courses & programmes", exact: true }).click();
      await page.getByRole("button", { name: "Add course", exact: true }).click();
      await page.getByLabel("Course title").fill("Browser QA course"); await page.getByLabel("URL slug").fill("browser-qa-course");
      await page.getByRole("checkbox", { name: /Arjun Sharma/ }).check();
      await page.getByRole("button", { name: "Save changes" }).click();
      await page.getByText("Browser QA course", { exact: true }).waitFor();
      await page.reload(); await page.getByText("Browser QA course", { exact: true }).waitFor();
      await page.getByRole("button", { name: "Edit Browser QA course", exact: true }).click();
      assert.equal(await page.getByRole("checkbox", { name: /Arjun Sharma/ }).isChecked(), true);
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.getByRole("button", { name: "View Browser QA course", exact: true }).click();
      await page.getByRole("dialog").getByRole("tab", { name: "Syllabus & faculty", exact: true }).click();
      await page.getByRole("dialog").getByRole("heading", { name: "Arjun Sharma", exact: true }).waitFor();
      await page.getByRole("dialog").getByText("Updated teaching role", { exact: true }).waitFor();
      await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: "Delete Browser QA course", exact: true }).click(); await page.getByRole("button", { name: "Delete record", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector("dialog[open]"));
      for (const label of ["Registered users", "Course registrations", "Course enrolments", "Batches & schedule", "Learning content", "Test series", "Payments", "Website pages", "Faculty", "Student results", "Projects", "Enquiries", "Settings", "Audit trail"]) {
        await page.getByRole("button", { name: label, exact: true }).click();
        await page.getByRole("heading", { name: label, exact: true, level: 1 }).waitFor();
      }
      await page.getByRole("button", { name: "Audit trail", exact: true }).click();
      await page.getByRole("combobox", { name: "Section", exact: true }).selectOption("courses");
      await page.getByRole("searchbox", { name: "Search audit records", exact: true }).fill("Browser QA course");
      await page.locator(".audit-table tbody tr").first().getByRole("button", { name: /^View audit event/ }).click();
      await page.getByRole("dialog").getByRole("heading", { name: "Audit event details", exact: true }).waitFor();
      await page.getByRole("dialog").getByRole("heading", { name: "Changed fields", exact: true }).waitFor();
      await page.getByRole("dialog").getByRole("searchbox", { name: "Search changed fields", exact: true }).fill("title");
      assert.equal(await page.getByRole("dialog").locator(".audit-changes-table tbody tr").count(), 1);
      await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).click();
      await page.getByRole("button", { name: "Course registrations", exact: true }).click();
      await page.getByRole("cell", { name: "Demo payment", exact: true }).waitFor();
      await page.getByRole("button", { name: "Course enrolments", exact: true }).click();
      await page.getByRole("cell", { name: "Demo access", exact: true }).waitFor();
      await page.getByRole("button", { name: "Dashboard", exact: true }).click();
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole("button", { name: "Open navigation" }).click(); await page.getByRole("button", { name: "Faculty", exact: true }).click();
      await page.getByRole("heading", { name: "Faculty", exact: true, level: 1 }).waitFor();
      await page.waitForFunction(() => document.querySelector(".sidebar").getBoundingClientRect().right <= 0);
      if (process.env.WAARR_QA_ARTIFACTS) await page.screenshot({ path: path.join(process.env.WAARR_QA_ARTIFACTS, "admin-mobile.png"), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await context.close();
    } finally { await browser.close(); }
  });
}

await suite.test("logout and forged session rejection", async () => {
  const response = await fetch(`${base}/api/admin/auth`, { method: "DELETE", headers: { Cookie: cookie, Origin: base } });
  assert.equal(response.status, 200); assert.match(response.headers.get("set-cookie"), /Max-Age=0|Expires=Thu, 01 Jan 1970/i);
  cookie = `${cookie.slice(0, -5)}xxxxx`;
  assert.equal((await request("GET")).status, 401);
});
});
