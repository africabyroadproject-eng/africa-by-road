# Africa By Road — Comprehensive PRD vs. Codebase Audit Report

**Date:** August 14, 2026  
**Auditor:** Senior Software Architect & Lead Systems Engineer (25+ Years Experience)  
**Reference Document:** `Africa_By_Road_Unified_PRD.md`  
**Target Codebase:** `africa-by-road` (NestJS Backend API)  

---

## 1. Executive Summary

This document presents a rigorous, end-to-end technical audit comparing the **Africa By Road Unified Product Requirements Document (PRD v1.0)** against the current implementation of the `africa-by-road` NestJS backend repository.

### Key Audit Findings:
1. **Overall Functional Completion:** Approximately **30% – 35%** of the PRD requirements are built. The existing codebase is primarily a **Public Tourist API MVP**, focused on email/Google authentication, user profile management, basic voting, simple trivia/spins, and a MeCash payment integration.
2. **Major Architectural Discrepancy (Database Stack):**
   - **PRD Requirement (Section 3, Module O, Gap #5):** Standardized on **PostgreSQL** for relational integrity, foreign keys, transaction safety, structured migration scripts, append-only history tables (`contestant_stage_history`, `votes`, `prize_awards`), and strict schema relationships.
   - **Current Implementation:** Built entirely on **MongoDB + Mongoose** (`app.module.ts`, Atlas M0 cluster). There are no relational tables, foreign key constraints, or SQL migration files (`Module O` is incomplete and on the wrong technology stack).
3. **Complete Absence of Admin Platform Controllers (Modules I–M):**
   - The PRD requires a full suite of `/api/admin/*` endpoints guarded by granular Role-Based Access Control (RBAC).
   - In the codebase, **no Admin HTTP Controller exists**. `AdminService` only provides basic password hashing and login methods. None of the endpoints for **User Management (Module I)**, **Contestant Stage Management (Module J)**, **Voting Cycle Administration (Module K)**, **Trivia Management (Module L)**, or **Spin-the-Wheel Management (Module M)** exist.
4. **Missing Infrastructure Foundations:**
   - **Module N (Audit Logging):** PRD requires an append-only `audit_logs` database table tracking `admin_id`, `target_id`, `previous_value`, `new_value`, and IP. Currently, `AuditService` and `AuditMiddleware` merely print standard console logs via NestJS `Logger`.
   - **Module D (Transactional Email Queueing):** PRD requires Redis + BullMQ asynchronous queueing (EML-001). Emails are currently sent **synchronously** in the HTTP request path via SendGrid.

---

## 2. Module Status Matrix (PRD vs. Codebase)

Below is the definitive status of each of the 15 modules defined in Section 4 of `Africa_By_Road_Unified_PRD.md`:

| # | Module Name | PRD Surface | Dependencies | Status in Codebase | Implementation Summary & Gaps |
|---|---|---|---|---|---|
| **A** | Public Landing / Show Info | Public | None | 🟡 **Partially Built** | `GET /api/public/landing-page` exists. Hardcoded in `content.service.ts` instead of dynamic/CMS-driven. Route name differs from PRD (`/api/public/landing`). |
| **B** | Registration & Application Flow | Public | H (Auth) | 🟡 **Partially Built** | User profile update endpoints exist (`/api/profile/*`). Lacks the 3-step contestant funnel (`/api/public/register/*`). Does **not** create a separate `contestants` row upon application completion (REG-003). |
| **C** | Payment Processing | Public | B | 🟡 **Partially Built** | `/api/payments/checkout` and `/api/payments/verify` implemented with MeCash. Gateway catalog helper exists (`payment.service.ts`), but lacks Flutterwave/Paystack/PayPal/Stripe integrations and separate `payments` database ledger. |
| **D** | Transactional Email | Public/Backend | B, C | 🟡 **Partially Built** | SendGrid integration exists (`email.service.ts`) for Welcome/OTP/Password Reset. **Lacks Redis/BullMQ queueing** (EML-001) and payment/registration confirmation email triggers. |
| **E** | Public Voting | Public | F, H | 🟡 **Partially Built** | `GET /api/vote/contestants`, `GET /api/vote/leaderboard`, and `POST /api/vote/favorite` exist. Lacks `voting_cycles` model, cycle status checks, and rate-limiting per cycle (PVOT-001/002). |
| **F** | Public Trivia Participation | Public | H | 🟡 **Partially Built** | `GET /api/giveaway/trivia/question` and `POST /api/giveaway/trivia/submit` exist. Lacks active period windows (`period_start`, `period_end`), structured question sets, and trivia change audit logs. |
| **G** | Public Spin-the-Wheel Gameplay | Public | H | 🟡 **Partially Built** | `GET /api/giveaway/spin/status` and `POST /api/giveaway/spin` exist. Uses random array selection (`SPIN_PRIZES`) instead of weighted random selection over database prize slots with stock counts (PSW-001/003). Lacks `prize_snapshot` awards table. |
| **H** | Auth, RBAC, Sessions (shared) | Both | None | 🟡 **Partially Built** | Public Tourist auth is complete (JWT, OTP, Google OAuth, cookies). Admin auth exists only in service layer; **RBAC module permissions and session stores are completely missing** (AUTH-002/003). |
| **I** | Admin — User Management | Admin | H | 🔴 **Not Implemented** | **0% Built.** No `/api/admin/users` routes, no user detail, no block/unblock controllers, no subscription summary cards. |
| **J** | Admin — Contestants Management | Admin | B, H | 🔴 **Not Implemented** | **0% Built.** No `/api/admin/contestants` routes, no stage transition management (`current_stage`, `stage_history`), no elimination/withdrawn state machine. |
| **K** | Admin — Voting Management | Admin | E, J, H | 🔴 **Not Implemented** | **0% Built.** No `/api/admin/voting/*` routes, no voting cycle creation/archiving, no administrative contestant elimination. |
| **L** | Admin — Trivia Management | Admin | F, H | 🔴 **Not Implemented** | **0% Built.** No `/api/admin/trivia/*` CRUD endpoints, no status activation/deactivation, no answer change audit logging. |
| **M** | Admin — Spin-the-Wheel Management | Admin | G, H | 🔴 **Not Implemented** | **0% Built.** No `/api/admin/spin-wheel/prizes/*` endpoints, no 10-slot configuration, no stock management. |
| **N** | Audit Logging (shared infra) | Both | None | 🔴 **Not Implemented** | Console logger only (`AuditMiddleware` prints stdout). No persistent `audit_logs` database collection/table, no delta (`previous_value`/`new_value`) tracking, no `GET /api/admin/audit-logs` endpoint. |
| **O** | Data Model / Migrations | Backend | None | 🔴 **Not Implemented** | Built on MongoDB/Mongoose instead of PostgreSQL. No relational schema ERD, no foreign key constraints, no SQL migration files. |

---

## 3. Deep-Dive Technical Findings by Module

### Module A — Public Landing / Show Information
- **PRD Spec:** `GET /api/public/landing` returning CMS-driven content (hero copy, show highlights, country eligibility, rewards).
- **Codebase State:** Endpoints in `src/modules/public/public.controller.ts`:
  - `GET /api/public/landing-page` returns hardcoded JSON objects from `ContentService`.
- **Gap:** Content is hardcoded in TypeScript memory (`content.service.ts`). It is not editable via an admin dashboard or CMS table without a code deployment.

---

### Module B — Registration & Application Flow
- **PRD Spec:** A 3-step funnel:
  1. `POST /api/public/register/basic-info` (creates user & draft application).
  2. `GET /api/public/register/continuation?userId=` (resumes step 3 after payment confirmation).
  3. `POST /api/public/register/complete` (creates `contestants` row with height, photo, social links, emergency contact, health info, travel experience, defaulting to `Stage 1`).
- **Codebase State:** Located in `src/modules/profile/profile.controller.ts` and `src/modules/auth/schemas/tourist.schema.ts`.
  - User completes registration via `PUT /api/profile/personal`, `PUT /api/profile/social`, and `PUT /api/profile/documents`.
- **Gaps:**
  1. **No Separate `Contestants` Schema/Entity:** PRD Gap #1 specifies that a `contestants` row MUST be created upon completion of step 3. In the codebase, document uploads and profile fields are attached directly to the `Tourist` schema.
  2. **Missing Application Fields:** `height`, `emergency_contact_name`, `emergency_contact_relationship`, `emergency_contact_phone`, `health_info`, and `travel_experience` are missing from the schema.
  3. **No Stage Tracking:** `current_stage` and `contestant_stage_history` tables/collections do not exist.

---

### Module C — Payment Processing
- **PRD Spec:** Multi-gateway payment router supporting NGN (Paystack, Flutterwave), USD (Stripe, PayPal), and Crypto (Coinbase Commerce) behind a unified `PaymentProvider` interface. Payment status MUST be confirmed via server-to-server webhooks (PAY-001).
- **Codebase State:** Located in `src/modules/payments/`.
  - Implements `POST /api/payments/checkout`, `POST /api/payments/verify`, and `POST /api/payments/webhook` specifically for **MeCash**.
  - `PaymentService` contains catalog metadata for Paystack, Flutterwave, and Stripe, but no actual SDK integrations exist for them.
- **Gaps:**
  1. **No Dedicated `payments` Database Ledger:** Payments are recorded directly as `isPaid: true`, `paymentReference`, and `paymentDate` on the `Tourist` document. There is no `payments` table/collection tracking transactions, providers, status history, or amounts.
  2. **Single Gateway Lock-in:** Only MeCash is functional; Paystack, Flutterwave, Stripe, PayPal, and Coinbase are not integrated.

---

### Module D — Transactional Email
- **PRD Spec:** Transactional email service for payment confirmations and application completion. EML-001 mandates that emails are queued via **Redis + BullMQ** and sent asynchronously.
- **Codebase State:** Located in `src/modules/auth/services/email.service.ts`.
  - Uses `@sendgrid/mail` for welcome emails, OTP verification, and password resets.
- **Gaps:**
  1. **Synchronous Execution:** Emails are sent inline during the HTTP request cycle rather than offloaded to a background queue.
  2. **Missing Templates:** Payment confirmation and registration completion email templates do not exist.

---

### Module E & K — Voting System (Public & Admin)
- **PRD Spec:**
  - **Public (Module E):** `GET /api/public/voting/current`, `POST /api/public/voting/contestants/:id/vote`. Voting is tied to an active `voting_cycle`. Votes are immutable and never deleted.
  - **Admin (Module K):** `/api/admin/voting/*` to create cycles, archive old cycles, view live counts, and eliminate contestants (blocking further votes immediately).
- **Codebase State:** Located in `src/modules/vote/`.
  - Schemas: `Contestant` (`name`, `country`, `bio`, `imageUrl`, `votes`, `status`) and `Vote` (`tourist`, `contestant`, `voteDate`).
  - Routes: `GET /api/vote/contestants`, `GET /api/vote/leaderboard`, `POST /api/vote/favorite`.
- **Gaps:**
  1. **No Voting Cycles:** No `voting_cycles` entity exists. Votes are limited by calendar day (`voteDate`) rather than cycle windows.
  2. **Zero Admin Endpoints:** No administrative interface exists to start/stop cycles or manage votes.

---

### Module F & L — Trivia System (Public & Admin)
- **PRD Spec:**
  - **Public (Module F):** `GET /api/public/trivia/active`, `POST /api/public/trivia/:id/answer`. Enforces period windows (`period_start`, `period_end`) and 1 answer per user.
  - **Admin (Module L):** `/api/admin/trivia/*` CRUD endpoints. Updating correct answers after user submissions requires writing to `trivia_answer_change_log` (TRI-005).
- **Codebase State:** Located in `src/modules/giveaway/`.
  - Schemas: `TriviaQuestion` (`question`, `options`, `correctAnswer`, `isActive`) and `TriviaResponse`.
  - Public Routes: `GET /api/giveaway/trivia/question`, `POST /api/giveaway/trivia/submit`.
- **Gaps:**
  1. **No Active Time Windows:** Questions lack `period_start` and `period_end` date controls.
  2. **No Trivia Change Log:** `trivia_answer_change_log` is missing.
  3. **Zero Admin Controllers:** No `/api/admin/trivia` CRUD routes exist.

---

### Module G & M — Spin-the-Wheel Gameplay & Management
- **PRD Spec:**
  - **Public (Module G):** Server-side weighted random selection against 10 active prize slots (PSW-001). Prize awards store an immutable `prize_snapshot` (JSON copy of prize name/description at award time). Stock quantity decrements safely under concurrency (PSW-003).
  - **Admin (Module M):** `/api/admin/spin-wheel/prizes/*` to manage 10 prize positions, quantities, and status.
- **Codebase State:** Located in `src/modules/giveaway/`.
  - Schema: `GiveawaySpin` (`tourist`, `gameType`, `spinDate`, `prize`).
  - Routes: `POST /api/giveaway/spin`, `GET /api/giveaway/spin/status`, `GET /api/giveaway/winners`.
- **Gaps:**
  1. **Hardcoded Random Prizes:** Selects random strings from a hardcoded array `['Travel Backpack', 'Water Bottle', ...]` instead of reading configured database prizes.
  2. **No Prize Slot Entity / Stock Control:** No `prizes` collection/table exists; quantities and position constraints (1-10) are not enforced.
  3. **No Prize Snapshots:** Does not store snapshot metadata for historical integrity.
  4. **Zero Admin Controllers:** No `/api/admin/spin-wheel/prizes` routes exist.

---

### Module H — Auth, RBAC & Sessions
- **PRD Spec:** Unified auth system. Public users (email/password/OTP/Google OAuth). Admin staff with fine-grained RBAC permissions (`user_manager`, `contestant_manager`, `voting_manager`, `trivia_manager`, `prize_manager`) and session inactivity tracking.
- **Codebase State:** Located in `src/modules/auth/` and `src/modules/admin/`.
  - Public auth is well-built with JWT, OTP email verification, Google OAuth ID token verification, and cookie handling.
  - `AdminService` provides password hashing (bcrypt) and credentials verification.
- **Gaps:**
  1. **No RBAC Implementation:** Roles are limited to a binary string (`admin` | `superadmin`). The granular permission model required by AUTH-002 does not exist.
  2. **No Admin Auth Guard/Routes:** Admin endpoints are missing HTTP route definitions.

---

### Module I, J, K, L, M — Admin Platform Surface
- **PRD Spec:** Sections 5 (Modules I through M) outline a complete operational dashboard for staff.
- **Codebase State:** **Completely Absent.**
  - No `admin.controller.ts` exists in `src/modules/admin/`.
  - The following required endpoints do not exist in the codebase:
    - User Management: `GET /api/admin/users`, `PATCH /api/admin/users/:id/block`, `GET /api/admin/users/stats`
    - Contestants Management: `GET /api/admin/contestants`, `PATCH /api/admin/contestants/:id/stage`, `GET /api/admin/contestants/:id/history`
    - Voting Management: `GET /api/admin/voting/current`, `POST /api/admin/voting/cycles`, `POST /api/admin/voting/contestants/:id/eliminate`
    - Trivia Management: `GET /api/admin/trivia`, `POST /api/admin/trivia`, `PATCH /api/admin/trivia/:id`
    - Spin-the-Wheel Management: `GET /api/admin/spin-wheel/prizes`, `POST /api/admin/spin-wheel/prizes`, `DELETE /api/admin/spin-wheel/prizes/:id`

---

### Module N — Audit Logging Infrastructure
- **PRD Spec:** Section 5 (Module N) requires an append-only `audit_logs` database table capturing every state-changing admin action: `admin_id`, `action`, `module`, `target_type`, `target_id`, `previous_value` (JSON), `new_value` (JSON), `ip_address`, and `created_at`. Must expose `GET /api/admin/audit-logs`.
- **Codebase State:** `src/common/services/audit.service.ts` and `src/common/middleware/audit.middleware.ts`.
  - `AuditMiddleware` intercepts requests and logs string lines to stdout via NestJS `Logger`.
- **Gaps:** No database persistence, no state diff tracking (`previous_value`/`new_value`), no audit query endpoint.

---

### Module O — Data Model & Database Stack
- **PRD Spec:** Relational PostgreSQL database schema with migration scripts (Prisma/TypeORM/Knex). Foreign keys and unique constraints enforcing business rules across `users`, `contestants`, `payments`, `votes`, `voting_cycles`, `trivia`, `prizes`, `prize_awards`, and `audit_logs`.
- **Codebase State:** MongoDB + Mongoose (`MongooseModule` in `app.module.ts`).
- **Gaps:** The entire database foundation relies on a NoSQL document database, conflicting directly with the PRD recommendation in Section 3 & Section 8 (Gap #5).

---

## 4. Summary of Unimplemented Functionality

To provide a quick reference for project managers and engineering leads, the following table lists features specified in `Africa_By_Road_Unified_PRD.md` that are **currently missing** from the backend code:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNIMPLEMENTED FUNCTIONALITY CHECKLIST                            │
├───────────────────────────┬────────────────────────────────────────────────────────────┤
│ Category                  │ Missing Feature / Requirement                              │
├───────────────────────────┼────────────────────────────────────────────────────────────┤
│ Data & Infra (Mod O & N)  │ • PostgreSQL relational database & SQL migrations          │
│                           │ • Persistent append-only audit_logs DB table & query API   │
│                           │ • Redis + BullMQ asynchronous email queue (EML-001)        │
├───────────────────────────┼────────────────────────────────────────────────────────────┤
│ Public Funnel (Mod B & C) │ • 3-Step Contestant registration endpoints                 │
│                           │ • Separate Contestants entity creation (REG-003)           │
│                           │ • Multi-gateway payment providers (Paystack, Stripe, etc.) │
│                           │ • Dedicated Payments database ledger table                 │
├───────────────────────────┼────────────────────────────────────────────────────────────┤
│ Gamification (Mod E,F,G)  │ • Voting Cycles data model & cycle-based rate limits       │
│                           │ • Time-bounded Trivia questions (period_start / end)       │
│                           │ • Weighted random Spin selection over DB prize slots       │
│                           │ • Prize stock quantity decrement & immutable snapshots     │
├───────────────────────────┼────────────────────────────────────────────────────────────┤
│ Admin Platform (Mod I–M)  │ • Admin User Management Controller & Block/Unblock API     │
│                           │ • Contestant Stage Transition & History Tracking API       │
│                           │ • Voting Cycle Management & Elimination API                │
│                           │ • Trivia Management CRUD API                               │
│                           │ • Spin-the-Wheel 10-Slot Prize Management CRUD API         │
│                           │ • Fine-grained RBAC Permissions Guard (AUTH-002)           │
└───────────────────────────┴────────────────────────────────────────────────────────────┘
```

---

## 5. Architectural Recommendations & Remediation Plan

As a senior engineer reviewing this project, here is the recommended 5-step roadmap to align the codebase with the PRD:

### Step 1: Database Decisions & Foundation Setup (Module O & H)
- **Decision:** Decide whether to migrate from **MongoDB to PostgreSQL (Prisma / TypeORM)** as recommended in PRD Section 3, OR formally amend the PRD to accept MongoDB.
- **Action:** If staying on MongoDB, create missing collections (`contestants`, `payments`, `voting_cycles`, `prizes`, `prize_awards`, `audit_logs`, `contestant_stage_history`) with Mongoose schema validation.
- **RBAC:** Implement a NestJS `RolesGuard` supporting granular module permissions (`user_manager`, `contestant_manager`, `voting_manager`, `trivia_manager`, `prize_manager`).

### Step 2: Implement Admin Platform Controllers (Modules I–M)
- Create `src/modules/admin/controllers/`:
  - `admin-users.controller.ts` (Module I)
  - `admin-contestants.controller.ts` (Module J)
  - `admin-voting.controller.ts` (Module K)
  - `admin-trivia.controller.ts` (Module L)
  - `admin-spin-wheel.controller.ts` (Module M)
  - `admin-audit.controller.ts` (Module N)

### Step 3: Refactor Audit Logging (Module N)
- Replace basic stdout logging in `AuditService` with DB persistence into `AuditLogs`.
- Create a NestJS Interceptor (`@AuditLog({ module: 'contestant', action: 'MOVE_STAGE' })`) that automatically captures before-and-after document states.

### Step 4: Refactor Public Funnel & Gamification (Modules B, E, F, G)
- **Registration (Module B):** Separate the `Tourist` schema from the `Contestant` schema. Create a `Contestant` record only when step 3 is submitted after payment confirmation.
- **Voting (Module E):** Introduce `VotingCycle` schemas so votes are tracked against active cycles rather than loose daily dates.
- **Spin-the-Wheel (Module G):** Replace hardcoded prize arrays with DB queries against active `Prize` slots, implementing atomic stock decrements (`$inc: { quantity: -1 }`) and snapshot persistence.

### Step 5: Queueing Infrastructure (Module D)
- Introduce `@nestjs/bull` and Redis for asynchronous email processing to prevent API latencies during mass registration/voting events.

---
*Report generated and stored in `AFRICA_BY_ROAD_PRD_GAP_ANALYSIS.md`.*
