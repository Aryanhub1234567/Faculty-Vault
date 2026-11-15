# Faculty Vault
> **Your Academic Journey. One Secure Vault.**

**Faculty Vault** is a production-quality, academic records and document management system built for engineering institutes. It provides faculty members with a personal ERP workspace to organize, upload, manage, preview, search, and track their academic achievements, research publications, patents, conference presentations, FDPs, books, and book chapters.

---

## 1. Product Vision & Architecture

Faculty Vault solves the problem of scattered documents across local machines, lost certificates in emails, and cumbersome accreditation reporting (NAAC, NIRF, NBA).

### Three-Tier Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     FACULTY VAULT UI                        │
│      Next.js App Router • Tailwind CSS • Dark Aesthetic     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│   POSTGRESQL (SOURCE OF TRUTH)││ GOOGLE WORKSPACE DRIVE API  │
│ • User Accounts & Roles (RBAC)││ • Institutional Shared Drive│
│ • Faculty Profiles & Institutes││ • Automated Directory Tree  │
│ • Academic Sessions Filter   ││ • Private Document Storage │
│ • 6 Category Normalized Data ││ • Secure In-App Streaming   │
│ • Drive Folder Cache & Outbox│└─────────────────────────────┘
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  GOOGLE SHEETS REPORTING     │
│ • Durable SheetSyncJob Queue │
│ • 6 Dedicated Spreadsheet Tabs│
│ • Duplicate-Free Row Updates │
│ • Admin Retry & Error Monitor│
└──────────────────────────────┘
```

1. **PostgreSQL (Source of Truth):**
   - Stores all application entities: users, profiles, academic sessions, 6 category normalized details, Drive folder cache, outbox sync queue, and audit logs.
   - Applications and dashboard queries **never** depend on Google Drive or Sheets for querying data.

2. **Google Workspace Shared Drive (Document Storage):**
   - Automatically provisions and reuses a structured folder hierarchy:
     `Faculty Vault / Institute / FacultyID_FacultyName / AcademicSession / Category / SubCategory / RecordCode_Title / attachments`
   - Keeps documents private with backend streaming preview (never makes files public).

3. **Google Sheets (Reporting Layer):**
   - Asynchronous outbox worker pattern (`SheetSyncJob`) updates 6 institutional tabs:
     `Conference`, `Patent`, `FDP`, `Research Articles`, `Book Chapters`, `Books`.
   - Idempotent updates keyed by `Record ID` to prevent duplicate rows.

---

## 2. Six Academic Modules & Metadata

| Module | Core Fields Collected | Google Drive Structure |
|---|---|---|
| **1. Conference** | Title, Topic, Organizer, From Date, To Date, Nationality (National / International) | `Conference/National/` or `International/` |
| **2. Patent** | Type (Design / Utility), Title, Date of Apply, Date of Issue, Status (Publish / Grant) | `Patent/Design/` or `Utility/` -> `Publish/` or `Grant/` |
| **3. FDP** | Topic, Organizer, From Date, To Date | `FDP/` |
| **4. Research Articles** | Title, Publisher, Indexing (SCOPUS, WOS, SCI) | `Research Articles/SCOPUS/`, `WOS/`, `SCI/` |
| **5. Book Chapters** | Title, Topic, Date | `Book Chapters/` |
| **6. Books** | Status (Edit / Authored), Topic, Title, **ISBN** (stored as String preserving leading zeros and formatting), **Date** (Date type) | `Books/Edit/` or `Authored/` |

---

## 3. Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React icons, Sonner toast notifications.
- **Backend:** Next.js Route Handlers, Prisma ORM, PostgreSQL (with zero-config local SQLite option).
- **Authentication:** Auth.js / NextAuth with Google OAuth 2.0 and local dev account switcher.
- **Integrations:** Google Drive API v3 (Shared Drive hierarchy), Google Sheets API v4 (Reporting Outbox).
- **Testing:** Node.js native test runner (`node --test`), assert strict module.

---

## 4. Quick Start (Local Development)

### Prerequisites
- Node.js v18+ (tested on Node v20 and v24)
- npm v9+

### Step 1: Clone and Install Dependencies
```bash
git clone <repo-url> "Faculty Vault"
cd "Faculty Vault"
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

For zero-config local evaluation, the default `.env` is already configured with local storage fallback and pre-seeded database accounts:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="faculty-vault-secure-secret-key-min-32-chars"
AUTH_SECRET="faculty-vault-secure-secret-key-min-32-chars"
ADMIN_EMAILS="admin@facultyvault.edu,director@facultyvault.edu"
ENABLE_MOCK_STORAGE_FALLBACK="true"
```

### Step 3: Initialize Database and Seed Sample Data
```bash
# Push schema and generate Prisma client
npx prisma db push --schema=prisma/schema.sqlite.prisma

# Seed academic sessions, faculty profiles, and records across all 6 categories
node scripts/seed.mjs
```

### Step 4: Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Pre-Configured Test Accounts

The database comes pre-seeded with 3 accounts for immediate testing:

1. **Dean / Institutional Administrator:**
   - Email: `admin@facultyvault.edu`
   - Role: `ADMIN`, Status: `APPROVED`
   - Access: Full institutional records, session manager, faculty approval workflow, Sheets sync monitor, audit logs.

2. **Approved Senior Faculty Member:**
   - Email: `dr.sharma@facultyvault.edu`
   - Profile: Dr. Rajesh Sharma (Faculty ID: `F001`)
   - Role: `FACULTY`, Status: `APPROVED`
   - Access: Full personal ERP workspace, document upload, previews, all 6 category modules.

3. **Pending Faculty Registration:**
   - Email: `dr.mehta@facultyvault.edu`
   - Profile: Dr. Vikram Mehta (Faculty ID: `F003`)
   - Role: `FACULTY`, Status: `PENDING`
   - Used to test the Administrator approval / rejection workflow.

---

## 6. Google Cloud Platform (GCP) Configuration

When deploying with live Google Workspace Shared Drive and Google Sheets integrations:

### 1. Create a Google Cloud Project & Enable APIs
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `faculty-vault-production`.
3. Enable the following APIs in **APIs & Services > Library**:
   - **Google Drive API**
   - **Google Sheets API**

### 2. Create a Service Account
1. Navigate to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account**:
   - Name: `faculty-vault-service`
   - ID: `faculty-vault-service@<project-id>.iam.gserviceaccount.com`
3. Click into the newly created service account, go to the **Keys** tab, and click **Add Key > Create new key > JSON**.
4. Download the JSON key file.
5. In your production `.env`, set:
   ```env
   GOOGLE_SERVICE_ACCOUNT_EMAIL="faculty-vault-service@<project-id>.iam.gserviceaccount.com"
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

### 3. Setup Google Workspace Shared Drive
1. In Google Drive, create a new **Shared Drive** named `Faculty Vault`.
2. Click **Manage Members** and add the service account email (`faculty-vault-service@...`) with the **Content Manager** role.
3. Copy the Shared Drive ID from the URL (`https://drive.google.com/drive/folders/<ROOT_FOLDER_ID>`).
4. Set in `.env`:
   ```env
   GOOGLE_DRIVE_ROOT_FOLDER_ID="<ROOT_FOLDER_ID>"
   ```

### 4. Setup Google Sheets Reporting Spreadsheet
1. Create a new Google Spreadsheet named `Faculty Vault - Academic Records`.
2. Share the spreadsheet with the service account email as **Editor**.
3. Create 6 tabs with the exact names:
   - `Conference`
   - `Patent`
   - `FDP`
   - `Research Articles`
   - `Book Chapters`
   - `Books`
4. Copy the Spreadsheet ID from the URL (`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`).
5. Set in `.env`:
   ```env
   GOOGLE_SHEETS_SPREADSHEET_ID="<SPREADSHEET_ID>"
   ```

### 5. Google OAuth 2.0 for Faculty Sign-In
1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID > Web application**.
3. Add Authorized Redirect URI:
   - For Local: `http://localhost:3000/api/auth/callback/google`
   - For Production: `https://<your-domain>/api/auth/callback/google`
4. Set in `.env`:
   ```env
   AUTH_GOOGLE_ID="<client-id>.apps.googleusercontent.com"
   AUTH_GOOGLE_SECRET="<client-secret>"
   ```

---

## 7. Running Tests & Verifications

The test suite validates:
- Category-specific metadata schemas (Conference, Patent, FDP, Research Articles, Book Chapters, Books)
- Books ISBN string preservation (preventing numeric conversion of leading zeros e.g. `0-13-468599-7`)
- Date persistence without timezone drift
- File size, MIME type, and extension checks
- Drive directory hierarchy sanitization and path generation
- Sheets 6-tab column mapping and row formatting
- Role-based access control (RBAC): faculty record isolation & ownership
- Academic session global filtering
- Soft deletion mechanics

Run the complete test suite:
```bash
npm test
```
Result:
```
✔ Folder sanitization: removes illegal characters for Google Drive hierarchy
✔ Drive category subpath construction: Conference National vs International
✔ Drive category subpath construction: Patent Design/Utility and Publish/Grant
✔ Drive category subpath construction: Books Edit vs Authored
✔ Drive category subpath construction: Research Articles & FDP
✔ Database & RBAC: Verify academic session filtering and faculty record ownership
✔ Books record creation & update: ISBN string format and Date persistence
✔ Google Sheets reporting: verify 6 tab names and common headers
✔ Google Sheets row mapping for Books preserves ISBN string and date
✔ Google Sheets row mapping for Conference
✔ Conference validation: valid input passes
✔ Conference validation: end date before start date fails
✔ Patent validation: Design / Utility and Publish / Grant
✔ Books validation: status, topic, title, ISBN string, and Date
✔ File upload validation: extensions, size limit, and MIME types

ℹ tests 15 | pass 15 | fail 0
```

Build verification:
```bash
npm run build
```
Result: All 26 static and dynamic routes compiled with 0 errors.

---

## 8. Deployment (Vercel & PostgreSQL)

1. Provision a PostgreSQL database on **Neon** or **Supabase**.
2. Set `DATABASE_URL="postgresql://user:password@host/db?sslmode=require"`.
3. Run migrations / push schema:
   ```bash
   npx prisma db push --schema=prisma/schema.prisma
   node scripts/seed.mjs
   ```
4. Deploy to **Vercel**:
   - Set environment variables from `.env.example`.
   - Framework preset: **Next.js**.
   - Build command: `npm run build`.

---

## 9. License & Institutional Governance
Developed for engineering institutes to guarantee institutional data sovereignty, verified academic audits, and streamlined accreditation workflows.
