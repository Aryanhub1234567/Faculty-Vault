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

## 9. Quick Start (Local Development)

```bash
# 1. Clone repository
git clone <repo-url> "Faculty Vault"
cd "Faculty Vault"

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Initialize local SQLite database
npx prisma db push --schema=prisma/schema.sqlite.prisma
node scripts/seed.mjs

# 5. Start dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) and sign in as `admin@facultyvault.edu` to connect Google Drive storage!
