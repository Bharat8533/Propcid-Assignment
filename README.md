# EstateDesk — Enterprise Builder & Broker Registration Platform

A production-grade, full-stack real-estate registration and compliance management platform built with React 19, Tailwind CSS, Node.js / Express, and PostgreSQL (`pgcrypto`).

---

## 🚀 Key Features & Business Rules Implemented

| Rule | Description |
|------|-------------|
| **R1: Save Draft** | Allows partial saves as long as User Type (`builder` or `broker`) and either **Full Name** OR **Mobile** is filled. Any field filled must be strictly valid. Returns all validation errors at once. |
| **R2: Submit** | All mandatory fields must be valid and **both Email & Mobile must be OTP-verified**. Once submitted, the record becomes strictly **read-only**. |
| **R3: Dummy OTP Engine** | Generates dummy OTP `123456`, valid for 5 minutes, max 3 wrong attempts, and 30-second resend cooldown. Logged to server console; **never exposed in API responses**. |
| **R4: Verification Follows Value** | If a verified email or mobile number is modified, its verification badge is immediately revoked back to unverified. |
| **R5: Duplicate Protection** | Active records cannot share the same mobile or email (case-insensitive). Conflicts return HTTP 409 specifying the holding agent and status. |
| **R6: Ownership & Permissions** | Agents can only create, edit, view, and delete their own drafts. Administrators have read-only access to all records and cannot create/edit registrations. |
| **R7: Completion Meter** | Dynamic completion calculation: `floor((valid fields + email verified + mobile verified) / total * 100)`. 16 items for Broker, 19 for Builder. Locks to 100% upon submission. |
| **R8: Stale Drafts** | Drafts not updated for more than 7 days are flagged as **Stale Draft** with visual indicators and filter counters. |
| **R9: Indian Standard Time (`Asia/Kolkata`)** | Age calculations (18–100 years old today) and date filters are evaluated strictly in IST. |
| **R10: Soft Delete Audit** | Records are soft-deleted with timestamp and staff ID. Admins must provide a mandatory **10 to 200 character reason** for deletion. |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v3.4, `lucide-react`, Proxy configured for Express backend.
- **Backend**: Node.js ES Modules, Express 4, `bcryptjs`, `jsonwebtoken` (JWT), `pg` (PostgreSQL client with offline memory adapter fallback).
- **Database**: PostgreSQL 14+ with `pgcrypto` extension (`schema.sql`).
- **Testing**: Node.js native test runner (`node --test`).

---

## 👥 Demo Staff Credentials

| Role | Name | Email | Password |
|------|------|-------|----------|
| **Admin** | Asha Admin | `admin@test.com` | `Admin@123` |
| **Agent** | Vikram Agent | `vikram@test.com` | `Agent@123` |
| **Agent** | Meera Agent | `meera@test.com` | `Agent@123` |

---

## 🏃 Quick Start Guide

### 1. Start the Backend API

```bash
cd backend
npm install
npm start
# Or for live-reloading during development:
npm run dev
```

The backend starts at `http://localhost:5000`.
- Health Check: `http://localhost:5000/health`

### 2. Start the Frontend App

```bash
cd frontend
npm install
npm run dev
```

The frontend launches at `http://localhost:3000` (or `http://localhost:3001` if port 3000 is occupied). Requests to `/auth`, `/registrations`, and `/reports` are automatically proxied to the backend at port 5000.

---

## 🧪 Running Automated Tests

Run the complete backend test suite covering all 8 test modules (Authentication, R1-R10 rules, OTP flows, read-only locks, and reports):

```bash
cd backend
npm test
```

Build and typecheck the frontend bundle:

```bash
cd frontend
npm run build
```

---

## 🗄️ Database Setup (PostgreSQL)

If using a local PostgreSQL database instance:

1. Configure connection settings in `backend/.env`:
   ```env
   PGHOST=localhost
   PGPORT=5432
   PGUSER=postgres
   PGPASSWORD=postgres
   PGDATABASE=estatedesk
   ```

2. Run the migration script to apply `schema.sql`:
   ```bash
   cd backend
   npm run migrate
   ```

*(Note: EstateDesk includes a built-in memory adapter fallback so both backend APIs and tests run smoothly even when PostgreSQL is temporarily offline).*
