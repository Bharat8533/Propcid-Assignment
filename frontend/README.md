# EstateDesk - Real Estate Registration Frontend

A modern, responsive field-agent registration platform for registering **Builders** and **Brokers** with dummy OTP verification, completion tracking, draft saving, and administrative compliance reporting.

---

## 🚀 Quick Start

### 1. Run Development Server
```bash
cd frontend
npm install
npm run dev
```
The application will launch at: **`http://localhost:3000`**

### 2. Production Build
```bash
npm run build
```

---

## 🔑 Demo Staff Accounts (One-Click Testing)
A quick-switcher dropdown is provided in the top navigation bar so evaluators can switch roles instantly:

| Name | Role | Email | Password | Landing Page | Permissions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Asha Admin** | `admin` | `admin@test.com` | `Admin@123` | **Report Dashboard** | Full audit report, per-agent stats, delete any registration (mandatory reason 10–200 chars). Cannot create/edit. |
| **Vikram Agent** | `agent` | `vikram@test.com` | `Agent@123` | **Registration Form** | Create builder/broker registrations, save drafts, verify OTP, submit, edit/delete own drafts. |
| **Meera Agent** | `agent` | `meera@test.com` | `Agent@123` | **Registration Form** | Same agent privileges for testing multi-agent isolation. |

---

## 📋 Implemented Business Rules

- **R1: Save as Draft**: Requires User Type (Builder/Broker) and either Full Name or Mobile. Empty fields are permitted, but any filled field must be strictly valid. All invalid fields are reported at once.
- **R2: Submission**: Requires all mandatory fields for that user type to be filled and valid, plus both Email and Mobile must be verified via OTP. Submitted records become strictly read-only.
- **R3: Dummy OTP Verification**:
  - Sent for the currently entered email or mobile.
  - Test code is always **`123456`** (logged in browser console).
  - Valid for 5 minutes.
  - 3 attempts allowed before code expires.
  - 30-second cooldown on resending.
- **R4: Verification Follows Value**: Modifying an already verified email or mobile automatically invalidates the verified badge and requires fresh verification.
- **R5: Duplicate Protection**: Normalised 10-digit mobile check and email uniqueness verification.
- **R6: Role & Ownership Restrictions**: Agents can view/edit/delete only their own drafts. Admins can view all and delete with reason.
- **R7: Completion Percentage**:
  - **Broker**: `(Valid Filled Fields + Email Verified + Mobile Verified) ÷ 16 × 100` (rounded down).
  - **Builder**: `(Valid Filled Fields + Email Verified + Mobile Verified) ÷ 19 × 100` (rounded down).
  - **Submitted**: Always 100%.
- **R8: Stale Drafts**: Drafts older than 7 days since last update are flagged with a `⚠️ Stale (>7d)` badge in reports.
- **R9: India Time**: Age (18–100 years), experience validation (`<= age - 18`), and "Created Today" filter adhere to Indian standard time.
- **R10: Soft Deletion**: Deleted records are preserved with timestamp, user ID, and admin deletion reason.

---

## 📱 Responsive & Professional UI
- **Phone (360px)**: Single-column stacked fields, touch targets $\ge 44\text{px}$, numeric keyboard triggers (`inputmode="numeric"`), sticky bottom action buttons, and collapsible filter drawers.
- **Tablet (768px)**: 2-column input grid with responsive scrollable tables.
- **Desktop (1280px+)**: Spacious dashboard with side-by-side metric cards, agent productivity audits, and filterable directories.
