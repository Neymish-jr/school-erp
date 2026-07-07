# QA Users — Playwright & E2E Seeding

## Purpose

`seedQaUsers.js` creates **one stable account per RBAC role** for Playwright automation and manual QA. Accounts use predictable `@schoolerp.local` emails so `.env.playwright` never depends on ad-hoc test data.

The script is **idempotent**:

- Creates users that do not exist
- Updates name, role, school assignment, and password when they already exist
- Never inserts duplicate emails

## Credentials

Shared password for every QA account: **`Password@123`**

| Role | Email |
|------|-------|
| Super Admin | `qa.superadmin@schoolerp.local` |
| DPO | `qa.dpo@schoolerp.local` |
| BEO | `qa.beo@schoolerp.local` |
| Principal | `qa.principal@schoolerp.local` |
| Office Staff | `qa.office@schoolerp.local` |
| Teacher | `qa.teacher@schoolerp.local` |

### School assignment

| Role | `school_id` |
|------|-------------|
| Super Admin | `null` (platform operator) |
| DPO, BEO | First demo school in the database |
| Principal, Office Staff, Teacher | First demo school in the database |

The teacher account is linked to an **unassigned active teacher** at the demo school when one is available (`teacher_id`).

Passwords are hashed with **bcrypt (10 rounds)** — the same approach used in `authController.js`.

## Prerequisites

1. PostgreSQL running with `backend/.env` configured.
2. At least **one school** in the `schools` table.

If no school exists, the script prints instructions and exits **without creating any users**.

Typical first-time setup:

```bash
node backend/scripts/seedDemoSchool.js
node backend/scripts/seedQaUsers.js
```

## How to run

From the repository root:

```bash
node backend/scripts/seedQaUsers.js
```

From the `backend/` directory:

```bash
node scripts/seedQaUsers.js
```

Safe to re-run before Playwright suites — passwords and metadata are refreshed.

## Expected output

```
QA users ready:

✓ Super Admin
✓ DPO
✓ BEO
✓ Principal
✓ Office Staff
✓ Teacher

Details:

School: <Demo School Name> (id 1)
Password (all accounts): Password@123

  [created] Super Admin    qa.superadmin@schoolerp.local   school_id=null ...
  ...
Copy credentials into .env.playwright (see .env.playwright.example).
```

On a repeat run, actions show `[updated]` instead of `[created]`.

## Playwright

After seeding, copy values from `.env.playwright.example` into `.env.playwright` (gitignored) at the repository root.

## Safety

The script calls `assertDevelopmentOnly()` from `demoSchoolUtils.js` and refuses to run against production-like database hosts unless `ALLOW_DEMO_SEED=true` is set explicitly.
