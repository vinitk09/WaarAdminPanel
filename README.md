# WAARR Academy Administration

A local administration app built around the sibling WAARR website in `../../Waar`. It uses the website's burgundy branding, existing imagery, nine-course catalogue, six sample faculty profiles, five student results, project portfolio and nine principal website pages.

## Start

```powershell
npm run dev
```

Open **http://localhost:3001**. Sign in with the prefilled development demo account: **admin@waarr.com** / **Admin@123**. There is no account-creation screen. The admin server binds to the local computer. Run the public website separately on port 3000; update its URL under Settings if needed.

## Available workflows

- Overview: actual learner, course, enquiry and schedule counts; programme composition; planning shortcuts and workspace activity.
- Audit trail: dedicated sidebar screen with administrator, action, section, timestamp, record and field-level before/after values for new successful changes. Filter by action, section, date or search; inspect entries with the eye icon. Older activity is retained without inventing missing field history.
- People & access: Registered users lists account holders, Course registrations lists submitted course forms and payment follow-up, and Course enrolments lists people with course access records. Verified active access, expired access, pending verification and demo access are shown separately.
- Courses: create, edit and delete drafts; edit descriptions, learning focus and syllabus modules/topics; assign multiple faculty profiles with the Assign faculty selector. Saved assignments appear under View > Syllabus & faculty.
- Enquiries: read website submissions, manage follow-up status and save internal notes.
- Registered users, course registrations, course enrolments and payments: authenticated, read-only views of the website's local LMS records. Demo payments are labelled and excluded from live revenue. Password hashes, salts and session tokens are never returned to the browser.
- Batches: manage course, start time, faculty, learner capacity and schedule status.
- Learning content: draft text lessons and HTTPS video links.
- Test series: author questions, answer options, correct answers, explanations and time limits.
- Website pages: draft hero text, page copy and SEO metadata for Home, About, Defence, Sports, Solutions, Workforce, Education, Performance Intelligence and Contact.
- Faculty, student results and projects: manage imported content and new drafts. Sample faculty identities and unverified project claims remain identified. Recommendation, written-exam clearance and final selection are separate result outcomes.
- Settings: academy details, website link, connection details, activity history and JSON content export.
- A search bar above every table, including dashboard programmes, all management lists, audit records and audit field changes. Searches support multiple words, clear controls, existing filters and pagination. Mobile navigation and accessible edit/confirmation dialogs are included.

## Storage and connection

Development uses the dummy administrator login above unless administrator environment credentials are configured. Existing hashed administrator records in `.data/admin-auth.json` remain supported outside development. Sessions use signed, expiring, HTTP-only cookies. Writes require a matching request Origin. Login attempts are limited in memory. New audit entries are retained in the local store rather than being limited to the 100-item recent-activity summary. Audit history covers admin content changes; it is not a tamper-proof external audit system and does not claim to record website login or payment events. Workspace changes are validated, serialized and saved atomically in `.data/admin.json`. The `.data` directory is excluded from Git.

The public website stores learner records in `../../Waar/.data/lms.json` and contact submissions in `../../Waar/.data/enquiries/*.json`. The admin app reads these on refresh and never modifies the sibling project's files. `WAARR_WEBSITE_PATH` can point to another local website checkout.

**Content editing is a persistent admin draft workflow. It does not publish to the public website.** The website currently renders source-code records and has no CMS publishing API. The catalogue and page-copy snapshots in `src/data/site-reference` initialize this app; subsequent website source edits are not automatically imported. Enquiry statuses and notes are admin-side annotations. Lessons, batches and tests drafted here do not yet change the learner portal. Export drafts from Settings for review and later integration.

The page editor holds copy and metadata drafts rather than a visual reconstruction of every JSX section. Payment processing, enrolment grants, email delivery, media uploads and public-site publishing require shared backend integration. The existing learner portal remains responsible for payment and access decisions.

## Environment configuration

Copy `.env.example` to `.env.local` if configuring paths or a pre-provisioned administrator. `WAARR_ADMIN_EMAIL` and `WAARR_ADMIN_PASSWORD` take priority over the local setup account. Set `WAARR_ADMIN_SESSION_SECRET` to a long random value to keep environment-based sessions valid across restarts; without it, sessions end when the server restarts. Account creation is disabled. The dummy account is available only in development; configure administrator environment credentials for a production build.

For deployment, configure the administrator environment values, persistent private storage and HTTPS. The current JSON store and login limiter are intended for a single local instance; use a transactional shared database, shared session controls and production rate limits before running multiple instances or allowing external staff access. The public website's enquiry and payment integrations have their own existing production limitations.

## Verification

```powershell
npm run build
npm test
```

Tests start a separate production server on port 3101 with isolated temporary data and a generated test password. They cover authentication, CSRF, validation, privacy, syllabus persistence, enquiry notes, references, deletion, logout and forged sessions. Build before testing after code changes. Set `WAARR_TEST_PORT` if port 3101 is occupied.

Browser checks are optional and use an existing Playwright installation and Chromium executable when `WAARR_PLAYWRIGHT_MODULE` and `WAARR_BROWSER_EXECUTABLE` are set. Set `WAARR_QA_ARTIFACTS` to save desktop and mobile screenshots. No browser dependency is added to the application.

The existing `next/font/google` imports need Google Fonts access on a cold build. Google Fonts files are served locally by Next.js after compilation.
