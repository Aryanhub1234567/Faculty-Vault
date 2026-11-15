# Faculty Vault
> **Your Academic Journey. One Secure Vault.**

**Faculty Vault** is a production-quality academic records and document management system built for engineering institutes. It provides faculty members with a personal ERP workspace to organize, upload, manage, preview, search, and track their academic achievements, research publications, patents, conference presentations, FDPs, books, and book chapters.

---

## 1. Product Vision & Architecture

Faculty Vault solves the problem of scattered documents across local machines, lost certificates in emails, and cumbersome accreditation reporting (NAAC, NIRF, NBA).

### System Architecture (OAuth 2.0 & My Drive Integration)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FACULTY VAULT UI                              │
│         Next.js 14 App Router • Tailwind CSS • Dark Aesthetic           │
└────────────────┬───────────────────────────────────────┬────────────────┘
                 │                                       │
                 ▼                                       ▼
┌─────────────────────────────────┐   ┌───────────────────────────────────┐
│   POSTGRESQL (SOURCE OF TRUTH)  │   │  GOOGLE DRIVE API (OAUTH 2.0)     │
│ • User Accounts & Roles (RBAC)  │   │ • Central: iiimt.facultyvault@gmail.com
│ • Faculty Profiles & Institutes │   │ • Storage: Regular Google Drive (My Drive)
│ • Academic Sessions Filter      │   │ • Root: My Drive / Faculty Vault  │
│ • 6 Category Normalized Data    │   │ • Automated Directory Tree        │
│ • Drive Folder Cache & Dedupe   │   │ • In-App Document Streaming Stream│
│ • Audit Logs & System Status    │   │ • Offline Refresh Token Lifecycle │
└────────────────┬────────────────┘   └───────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     GOOGLE SHEETS REPORTING     │
│ • Durable SheetSyncJob Queue    │
│ • 6 Dedicated Spreadsheet Tabs  │
│ • Duplicate-Free Row Updates    │
│ • Admin Retry & Error Monitor   │
└─────────────────────────────────┘
```

### Architecture Shift: Service Account vs. OAuth 2.0

| Dimension | Previous Architecture | Current Architecture (OAuth 2.0) |
|---|---|---|
| **Google Account Type** | Google Workspace (Paid Organization) | Regular Free Gmail (`iiimt.facultyvault@gmail.com`) |
| **Domain Requirement** | Custom domain required (`institute.edu`) | **Zero custom domain required** |
| **Storage Target** | Workspace Shared Drive | Account's **My Drive** (`My Drive / Faculty Vault`) |
| **Authentication Flow** | Service Account JWT (Private Key JSON) | **OAuth 2.0 Web Server Flow (Authorization Code)** |
| **Permission Scope** | Broad Drive Full Access (`drive`) | **Least-Privilege** (`https://www.googleapis.com/auth/drive.file`) |
| **Storage Ownership** | Service Account principal | Central Institute Account (`iiimt.facultyvault@gmail.com`) |
| **Admin Onboarding** | Service Account Key download & distribution | **One-time 1-Click Admin Consent** via Protected UI |
| **Professor Experience** | Institutional login; no Direct Drive access | Institutional login; **zero credentials exposed** |

---

## 2. Six Academic Modules & Metadata

| Module | Core Fields Collected | Google Drive Hierarchy |
|---|---|---|
| **1. Conference** | Title, Topic, Organizer, From Date, To Date, Nationality (National / International) | `Faculty Vault/.../Conference/National/` or `International/` |
| **2. Patent** | Type (Design / Utility), Title, Date of Apply, Date of Issue, Status (Publish / Grant) | `Faculty Vault/.../Patent/Design/` or `Utility/` -> `Publish/` or `Grant/` |
| **3. FDP** | Topic, Organizer, From Date, To Date | `Faculty Vault/.../FDP/` |
| **4. Research Articles** | Title, Publisher, Indexing (SCOPUS, WOS, SCI) | `Faculty Vault/.../Research Articles/SCOPUS/`, `WOS/`, `SCI/` |
| **5. Book Chapters** | Title, Topic, Date | `Faculty Vault/.../Book Chapters/` |
| **6. Books** | Status (Edit / Authored), Topic, Title, **ISBN** (String preserving leading zeros), **Date** (Date type) | `Faculty Vault/.../Books/Edit/` or `Authored/` |

---

## 3. Technology Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React icons, Sonner toast notifications.
- **Backend:** Next.js Route Handlers, Prisma ORM, PostgreSQL (with zero-config local SQLite option).
- **Authentication:** Auth.js / NextAuth (Professor session login) + Google OAuth 2.0 Web Server Flow (Central Storage bridge).
- **Storage & APIs:** Google Drive API v3 (OAuth 2.0 with offline auto-refresh), Google Sheets API v4 (Reporting Outbox).
- **Security:** CSRF State parameters, HTTP-Only secure cookies, Least-Privilege `drive.file` scope.
- **Testing:** Node.js native test runner (`node --test`), assert strict module.

---

## 4. Google Cloud Console Configuration Guide

Follow these exact steps to configure Google Cloud Platform for the central account `iiimt.facultyvault@gmail.com`:

### Step 1: Create a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/) signed in as `iiimt.facultyvault@gmail.com`.
2. Click the project dropdown at the top left and select **New Project**.
3. Set **Project Name**: `Faculty Vault` (or `faculty-vault-storage`).
4. Leave **Organization** as "No organization" (standard for free Gmail accounts).
5. Click **Create** and ensure the new project is selected.

### Step 2: Enable the Google Drive API
1. Navigate to **APIs & Services > Library** from the left navigation menu.
2. In the search bar, search for **Google Drive API**.
3. Select **Google Drive API** and click **Enable**.
4. *(Optional for reporting)*: Also search for and enable the **Google Sheets API**.

### Step 3: Configure the OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**.
2. Select **User Type**: **External** (standard for non-Workspace free accounts) and click **Create**.
3. Fill in the **App Information**:
   - **App name**: `Faculty Vault`
   - **User support email**: `iiimt.facultyvault@gmail.com`
   - **Developer contact information**: `iiimt.facultyvault@gmail.com`
4. Click **Save and Continue**.

### Step 4: Add Least-Privilege Scopes
1. On the **Scopes** step, click **Add or Remove Scopes**.
2. Select the following scopes:
   - `https://www.googleapis.com/auth/drive.file` (Per-file access: grants read/write access ONLY to files and folders created or opened by Faculty Vault. Does not expose private personal files in the Gmail account).
   - `https://www.googleapis.com/auth/userinfo.email` (Allows the application to confirm and display the connected storage account).
3. Click **Update**, then **Save and Continue**.

### Step 5: Configure Test Users
1. On the **Test users** step, click **+ Add Users**.
2. Add the storage owner account: `iiimt.facultyvault@gmail.com`.
3. Add any administrator Gmail accounts who will authorize the app.
4. Click **Save and Continue**, then review the summary and return to the dashboard.

### Step 6: Create OAuth 2.0 Client ID Credentials
1. Navigate to **APIs & Services > Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Set **Application type**: **Web application**.
4. Set **Name**: `Faculty Vault Web Client`.
5. Under **Authorized JavaScript origins**:
   - For local development: `http://localhost:3000`
   - For production: `https://your-domain.vercel.app`
6. Under **Authorized redirect URIs**:
   - Add: `http://localhost:3000/api/auth/google/callback`
   - For production: `https://your-domain.vercel.app/api/auth/google/callback`
   *(Note: If you also use Google Sign-in for professor login via NextAuth, also add `http://localhost:3000/api/auth/callback/google`)*.
7. Click **Create**.
8. A modal will appear displaying your **Client ID** and **Client Secret**. Copy both values.

### Step 7: Configure Environment Variables
In your `.env` file (or deployment environment), set:
```env
GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-client-secret>"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

### Step 8: Perform One-Time Authorization
1. Start your local application (`npm run dev`).
2. Log in as an administrator (e.g. `admin@facultyvault.edu` or any email in `ADMIN_EMAILS`).
3. Navigate to **Admin Panel > Google Drive Storage** tab (`/admin?tab=drive`).
4. Click the button: **Connect iiimt.facultyvault@gmail.com**.
5. You will be redirected to Google's consent screen. Sign in with `iiimt.facultyvault@gmail.com`.
6. Grant the requested Drive permissions.
7. Google will redirect back to `/api/auth/google/callback`, exchange the code for access and refresh tokens, securely store the refresh token in `.google-tokens.json`, and automatically initialize the root folder `Faculty Vault` in My Drive!

### Step 9: Testing Mode vs. Production Deployment Considerations
> [!IMPORTANT]
> **Refresh Token Expiry in Testing Mode vs Production:**
> When an OAuth application has an **External** publishing status and is in **Testing** mode, Google automatically expires refresh tokens **after 7 days**.
> - **Testing Mode:** Works immediately with the designated Test Users (`iiimt.facultyvault@gmail.com`), but you may need to click "Reconnect" once a week.
> - **Production Mode:** Once ready, click **Publish App** on the OAuth consent screen to move from "Testing" to "In Production".
> - **Verification Note:** Because Faculty Vault uses the `.../auth/drive.file` scope (which Google classifies as non-sensitive when restricted to app-created files), full third-party CASA security verification is **not** required. You can complete the verification questionnaire easily without paid security assessments.

---

## 5. Storage Architecture in My Drive

Because free Gmail accounts do not support Workspace Shared Drives, Faculty Vault utilizes the account's standard **My Drive**:

### Root Folder Management: `My Drive / Faculty Vault`
1. **Zero Duplicate Root Folders:**
   Faculty Vault automatically searches My Drive for an existing folder named `Faculty Vault` inside `root`. If found, it caches its Google Drive ID in PostgreSQL (`DriveFolder` table) and `.google-tokens.json`. If not found, it creates the folder once. Subsequent restarts always reuse the cached ID.
2. **Deterministic Directory Tree:**
   All uploads are filed inside nested subfolders:
   ```
   My Drive/
   └── Faculty Vault/
       └── Institute Name/
           └── F001_Dr Rajesh Sharma/
               └── 2026-27/
                   └── Conference/
                       └── National/
                           └── REC-1001_Quantum_AI_Paper/
                               └── paper.pdf
   ```
3. **No Root Clutter:** No application files are ever dumped directly into My Drive root.
4. **Backend Streaming:** Files are streamed securely to authenticated users through `/api/files/[id]/preview` after verifying institute RBAC permissions.

---

## 6. Application-Level Access Control (RBAC)

The central Gmail account (`iiimt.facultyvault@gmail.com`) acts solely as a silent backend storage layer.

- **Faculty Members:** Authenticate using their own institute accounts (credentials or institute Google sign-in). They **never** receive the central Google account credentials or access to the Gmail account.
- **Role Isolation:**
  - `FACULTY`: Can only upload, view, edit, and preview documents belonging to their own faculty profile.
  - `ADMIN`: Can view cross-institutional statistics, approve/reject registrations, manage academic sessions, monitor Google Sheets sync outbox, and manage the central Google Drive OAuth connection.
- **Data Protection:** The `Faculty Vault` folder in Drive remains private and is never made publicly accessible on the web.

---

## 7. Backend Endpoints Summary

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/auth/google` | Initiates OAuth 2.0 code flow; generates CSRF state cookie | Admin Only |
| `GET` | `/api/auth/google/callback` | Validates CSRF state, exchanges code, persists refresh token | Admin / OAuth Callback |
| `GET` | `/api/auth/google/status` | Returns real-time health, connected email, root folder ID | Authenticated Users |
| `POST` | `/api/auth/google/disconnect` | Revokes OAuth tokens and clears stored credentials | Admin Only |
| `GET` | `/api/files/[id]/preview` | Streams file binary directly from Google Drive using OAuth | RBAC Filtered |

---

## 8. Running Tests & Verifications

The test suite validates:
- OAuth configuration loader & least-privilege `drive.file` scope
- Cryptographic CSRF state generation and constant-time validation
- Authorization URL generation with `access_type=offline` and `prompt=consent`
- Refresh token persistence across restarts without overwrite regressions
- Central root folder resolution & deduplication (`getRootFolderId`)
- Google Drive CRUD operations: Upload, Download, Stream, Metadata, List, Create Folder, Move, Rename, Delete, Search
- Academic modules validation (Conference, Patent, FDP, Research Articles, Book Chapters, Books with string ISBNs)
- Google Sheets 6-tab row mapping
- Role-based access control (RBAC): faculty record isolation & ownership

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
✔ OAuth 2.0: Configuration loader detects credentials and least-privilege scopes
✔ OAuth 2.0: CSRF state generation and validation protects against tampering
✔ OAuth 2.0: Authorization URL requests offline access and consent prompt
✔ OAuth 2.0: Token persistence preserves refresh token across subsequent updates
✔ Google Drive: Central root folder resolution and deduplication
✔ Google Drive: CRUD, file upload, search, rename, move, delete operations
✔ Security & RBAC: Ensure central credentials and tokens are protected
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

ℹ tests 22 | pass 22 | fail 0
```

Production build verification:
```bash
npm run build
```
Result: All 30 routes compiled with 0 errors.

---

## 9. Database Initialization & Workflows

Faculty Vault cleanly separates development/demo initialization from production initialization.

### A. Local SQLite Initialization (Zero-Config Development)

Faculty Vault includes zero-config SQLite support for rapid local development and offline testing without needing a local PostgreSQL instance.

```bash
# 1. Clone repository & install dependencies
git clone <repo-url> "Faculty Vault"
cd "Faculty Vault"
npm install

# 2. Configure environment for SQLite
cp .env.example .env
# Ensure .env has: DATABASE_URL="file:./dev.db" and NODE_ENV="development"

# 3. Initialize SQLite schema and seed demo data
npm run db:init:dev
# (Or use the explicit shortcut: npm run db:init:local)

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in using one of the pre-seeded instant accounts (`admin@facultyvault.edu` or `dr.sharma@facultyvault.edu`).

### B. Development PostgreSQL Initialization

If you develop locally against a PostgreSQL instance (e.g., local Docker container or cloud dev branch):

```bash
# 1. In .env, set your development PostgreSQL connection string:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/faculty_vault_dev?schema=public"
NODE_ENV="development"

# 2. Run development initialization
npm run db:init:dev
```

`npm run db:init:dev` uses `scripts/prisma-cli.mjs` to auto-detect the PostgreSQL provider, synchronize the schema via `prisma db push`, and seed the isolated development database with demo data.

### C. Production PostgreSQL Initialization

Production initialization is strictly isolated from demonstration data and protected against accidental mock-data contamination.

```bash
# 1. Configure production environment variables in your deployment dashboard or .env.production:
DATABASE_URL="postgresql://user:password@host:5432/faculty_vault?schema=public"
NODE_ENV="production"
INSTITUTE_NAME="Your Engineering College / Institute Name"
INSTITUTE_CODE="INST-01"
ADMIN_EMAILS="dean@institute.edu,director@institute.edu"
INITIAL_ADMIN_EMAIL="dean@institute.edu"

# 2. Run the production initialization workflow:
npm run db:init:prod
```

`npm run db:init:prod` executes `scripts/init-prod.mjs`, which:
1. Validates that `DATABASE_URL` is a PostgreSQL connection.
2. Initializes the PostgreSQL schema (`prisma migrate deploy` if migrations exist, or `prisma db push`).
3. Creates or verifies the actual institute from `INSTITUTE_NAME` and `INSTITUTE_CODE`.
4. Initializes default academic sessions (`2022-23` through `2029-30`) without duplicating existing sessions.
5. Creates or verifies the initial administrator user and profile using `INITIAL_ADMIN_EMAIL` / `ADMIN_EMAILS`.
6. Enforces strict production integrity: **never** creates demo faculty accounts, fabricated records, mock Drive attachment references, demo audit logs, or synthetic Sheets sync jobs.
7. Operates completely idempotently—safe to run repeatedly on new or existing deployments.

---

## 10. Demo Seeding vs. Production Bootstrap

| Dimension | Development Demo Seed (`npm run db:init:dev` / `npm run seed`) | Production Bootstrap (`npm run db:init:prod`) |
|---|---|---|
| **Script** | `scripts/seed.mjs` | `scripts/init-prod.mjs` |
| **Target Database** | SQLite (`dev.db`) or Dev PostgreSQL | PostgreSQL only (Neon, Supabase, RDS, etc.) |
| **Production Protection** | **Hard-blocked** when `NODE_ENV=production` | Designed specifically for production/staging |
| **Schema Initialization** | Auto-detected `prisma db push` | `prisma migrate deploy` or `prisma db push` |
| **Institute** | Demo "Apex Institute of Technology & Engineering" (`NITE-01`) | Configured via `INSTITUTE_NAME` and `INSTITUTE_CODE` |
| **Administrator Account** | Demo Admin (`admin@facultyvault.edu`) | Configured via `INITIAL_ADMIN_EMAIL` / `ADMIN_EMAILS` |
| **Faculty Accounts** | 3 demo faculty (Sharma, Roy, Mehta) | **Zero** demo accounts (real faculty register via OAuth/SSO) |
| **Academic Records** | 6 sample records (Conference, Patent, FDP, Research, Chapter, Book) | **Zero** fabricated records |
| **Google Drive Attachments** | Mock Google Drive folder and file IDs | **Zero** mock attachments |
| **Audit Logs** | Demo record creation audit log | **Zero** demonstration audit logs |
| **Sheets Sync Jobs** | Synthetic `SUCCEEDED` sync job | **Zero** synthetic sync jobs |
| **Idempotency** | Safe to re-run (deduplicates audit logs and accounts) | Safe to re-run (verifies existing institute, sessions, and admin) |

---

## 11. Migration-Baselining Procedure

When deploying Faculty Vault to an existing production PostgreSQL database that was originally created or updated with `prisma db push`, or when transitioning from prototyping to version-controlled schema migrations, you must **baseline** your database.

### Why Baselining is Required

Prisma Migrate tracks migration history in a table named `_prisma_migrations`. If you run `prisma migrate dev` or `prisma migrate deploy` against an existing database that already contains tables but lacks this migration history table, Prisma cannot determine which migrations have already been applied and may attempt to recreate existing tables or prompt to reset the database (which would drop production data). Baselining registers the existing schema state as already applied.

### Step-by-Step Baselining Procedure

#### Step 1: Ensure Your Schema Matches the Database State
Ensure `prisma/schema.prisma` reflects the exact desired database structure.

#### Step 2: Create the Baseline Migration Directory
Create a dedicated migration directory for the initial baseline:

On Linux / macOS / Bash:
```bash
mkdir -p prisma/migrations/0_init
```

On Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Path "prisma/migrations/0_init" -Force
```

#### Step 3: Generate the Initial Migration SQL Script
Generate a complete SQL script representing the entire schema without connecting to or altering the live database:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

Verify that `prisma/migrations/0_init/migration.sql` contains the complete DDL statements (`CREATE TABLE`, `CREATE TYPE`, `CREATE INDEX`, etc.).

#### Step 4: Baseline the Existing Database
Mark the `0_init` migration as already applied on your existing database so Prisma knows not to re-execute it:

```bash
npx prisma migrate resolve --applied 0_init --schema=prisma/schema.prisma
```

Prisma will record `0_init` in the `_prisma_migrations` table without executing the SQL script.

#### Step 5: Verify Deployment on New Environments
For fresh environments (e.g., CI test databases or new deployments), running:

```bash
npm run prisma:migrate:prod
# or: npx prisma migrate deploy --schema=prisma/schema.prisma
```

will automatically apply `0_init` and any subsequent migrations in sequential order.

#### Step 6: Ongoing Schema Evolution
For future schema updates:
- **In Development:** Edit `prisma/schema.prisma` and run `npm run prisma:migrate` (`prisma migrate dev`). Prisma will prompt for a migration name, generate a new timestamped migration directory, apply it to your development database, and regenerate the client.
- **In Production / CI/CD:** Commit the generated migration folder to Git and run `npm run prisma:migrate:prod` (`prisma migrate deploy`) during production deployment before booting the application.

---

## 12. Scripts Reference

Faculty Vault provides dedicated scripts for development, testing, and production operations:

| Command | Target Datasource | Purpose |
|---|---|---|
| `npm run db:init:dev` | Auto-detected (SQLite or PostgreSQL) | One-step development initialization: pushes schema and seeds demo data idempotently |
| `npm run db:init:local` | SQLite (`schema.sqlite.prisma`) | Explicit one-step SQLite schema push and demo database seeding |
| `npm run db:init:prod` | PostgreSQL (`schema.prisma`) | Production initialization: initializes PostgreSQL schema and bootstraps real institute, administrator, and academic sessions without demo data |
| `npm run db:bootstrap:prod` | PostgreSQL (`schema.prisma`) | Production bootstrap only (runs `init-prod.mjs --skip-schema`, useful when migrations are deployed separately in CI) |
| `npm run seed` | Auto-detected (SQLite or PostgreSQL) | Seeds development database with demo data (blocked if `NODE_ENV=production`) |
| `npm run prisma:generate` | Auto-detected | Generates `@prisma/client` from SQLite or PostgreSQL schema based on `DATABASE_URL` |
| `npm run prisma:generate:sqlite` | SQLite (`schema.sqlite.prisma`) | Explicitly generates Prisma client for SQLite |
| `npm run prisma:generate:postgres` | PostgreSQL (`schema.prisma`) | Explicitly generates Prisma client for PostgreSQL |
| `npm run prisma:push` | Auto-detected | Pushes schema structure directly to active database |
| `npm run prisma:push:sqlite` | SQLite (`schema.sqlite.prisma`) | Pushes SQLite schema to `prisma/dev.db` |
| `npm run prisma:push:postgres` | PostgreSQL (`schema.prisma`) | Pushes PostgreSQL schema to PostgreSQL database |
| `npm run prisma:migrate` | Auto-detected | Runs `prisma migrate dev` for iterative local development schema migrations |
| `npm run prisma:migrate:prod` | PostgreSQL (`schema.prisma`) | Runs `prisma migrate deploy` for production release migrations |
| `npm run prisma:studio` | Auto-detected | Opens Prisma Studio GUI for current database |
| `npm test` | Test runner | Runs Node.js test suite across all modules with ES module loader |
| `npm run build` | Auto-detected | Generates Prisma Client and compiles Next.js production build |


