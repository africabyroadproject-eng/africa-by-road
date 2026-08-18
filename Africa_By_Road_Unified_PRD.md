# Africa By Road — Unified Full-Stack Product Requirements Document
**Version:** 1.0 · **Status:** Draft for engineering sign-off · **Prepared for:** Dev team / AI engineering agents
**Sources consolidated:** *Africa By Road — Admin Platform Requirements* + *Africabyroad Registration Website PRD*

---

## 0. How to Use This Document

This PRD merges the two source documents (Admin Platform + Public Registration Website) into **one system spec**, because they are two faces of the same product and share a database, auth model, and domain entities (Users, Contestants, Votes, Trivia, Prizes).

It is organized into **independent, checkbox-trackable modules** (Section 5). Each module has its own scope, data model, endpoints, business rules, and acceptance criteria, so it can be assigned, built, and marked complete independently. Use the **Module Status Tracker** (Section 4) as the single source of truth for "what's done, what's left" — update the status column as work lands.

A **Gap & Conflict Log** (Section 8) is included — these are inconsistencies or missing pieces I found reconciling the two source documents that need a decision before/while building.

---

## 1. Product Overview

**Product:** Africa By Road — a reality-TV-style competition platform.

**System = two connected surfaces on one shared backend:**

| Surface | Audience | Purpose |
|---|---|---|
| **Public Web App** | General public / applicants / voters | Show info, contestant registration, payment, public voting, trivia participation, spin-the-wheel gameplay |
| **Admin Platform** | Internal staff | Manage users, contestants, voting cycles, trivia, prizes, and audit everything |
| **Backend API** | Both | Single REST API (`/api/public/*` and `/api/admin/*`) over a shared database |

**Core goals:**
- Seamless registration → payment → application funnel for contestants.
- Fair, auditable voting and elimination process.
- Engagement features (trivia, spin-the-wheel) to retain the general user base.
- Full admin control and audit trail over every state-changing action, with **no hard deletes** of votes, stage history, or prize records.

---

## 2. System Architecture

```
                    ┌─────────────────────────┐
                    │   Public Web App (SPA)  │
                    │  React/Next.js frontend │
                    └────────────┬────────────┘
                                 │ REST/JSON (HTTPS)
                    ┌────────────▼────────────┐
                    │   Admin Web App (SPA)   │
                    │  React/Next.js frontend │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      Backend API        │
                    │  Node.js + Express/Nest │
                    │  /api/public  /api/admin│
                    └──┬───────┬───────┬──────┘
                       │       │       │
              ┌────────▼─┐ ┌───▼───┐ ┌─▼─────────────┐
              │PostgreSQL│ │ Redis │ │ Object Storage │
              │ (primary)│ │(cache/│ │ (S3-compatible │
              │          │ │queue) │ │  photo uploads)│
              └──────────┘ └───────┘ └────────────────┘
                       │
        ┌──────────────┼───────────────────────┐
        │              │                        │
┌───────▼──────┐ ┌─────▼────────┐   ┌───────────▼──────────┐
│Payment Gateways│ │ Email Service │   │ Audit Log (append-  │
│Flutterwave/    │ │ SendGrid/SES  │   │ only table, all mods)│
│Paystack/Stripe/│ │               │   │                      │
│PayPal/Coinbase │ │               │   │                      │
└────────────────┘ └───────────────┘   └──────────────────────┘
```

**Recommendation:** treat Public and Admin as **two frontends, one backend, one database**. Do not fork the API — the Admin "Contestants" table and the Public "Registration" flow both read/write the same `contestants` table; keeping them on separate backends is how these two source docs drifted apart in the first place (see Section 8).

---

## 3. Recommended Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Public frontend | **Next.js (React) + TypeScript** | SSR for SEO on the landing/show-info pages; TailwindCSS |
| Admin frontend | **React + TypeScript (Vite)** | SPA is fine, no SEO need; Tailwind + a component library (shadcn/ui or MUI) |
| Backend | **NestJS (Node.js/TypeScript)** | Modular by design — maps 1:1 to the modules below; built-in guards for RBAC |
| Database | **PostgreSQL** | Relational integrity matters here (votes, stages, payments) — pick Postgres over MongoDB |
| Cache/Queue | **Redis + BullMQ** | Vote-count caching, email queue, rate limiting on voting endpoints |
| File storage | **S3-compatible bucket (AWS S3 / Cloudflare R2)** | Profile photos, application documents |
| Payments | **Flutterwave, Paystack (NGN), Stripe/PayPal (USD), Coinbase Commerce (crypto)** | Behind a single internal `PaymentProvider` interface — see Module B |
| Email | **SendGrid or Amazon SES** | Transactional templates, domain-verified |
| Auth | **JWT (access + refresh) + RBAC** for admin; JWT or magic-link/OTP for public users | See Module H |
| Infra | Dockerized services, CI/CD (GitHub Actions), staging + production environments | |

> This supersedes the "MongoDB or PostgreSQL" and "ReactJS/VueJS" either/or language in the original registration PRD — for a system with financial transactions, voting integrity, and audit requirements, Postgres + a single frontend framework is the stronger call.

---

## 4. Module Status Tracker

Copy this table into your tracker of choice (Jira/Linear/Notion) and update **Status** per module. Suggested states: `Not Started` · `In Progress` · `Built — Needs Review` · `Done`.

| # | Module | Surface | Depends On | Status |
|---|---|---|---|---|
| A | Public Landing / Show Info | Public | — | ☐ |
| B | Registration & Application Flow | Public | H (Auth) | ☐ |
| C | Payment Processing | Public | B | ☐ |
| D | Transactional Email | Public/Backend | B, C | ☐ |
| E | Public Voting | Public | F, H | ☐ |
| F | Public Trivia Participation | Public | H | ☐ |
| G | Public Spin-the-Wheel Gameplay | Public | H | ☐ |
| H | Auth, RBAC, Sessions (shared) | Both | — | ☐ |
| I | Admin — User Management | Admin | H | ☐ |
| J | Admin — Contestants Management | Admin | B, H | ☐ |
| K | Admin — Voting Management | Admin | E, J, H | ☐ |
| L | Admin — Trivia Management | Admin | F, H | ☐ |
| M | Admin — Spin the Wheel Management | Admin | G, H | ☐ |
| N | Audit Logging (shared infra) | Both | — | ☐ |
| O | Data Model / Migrations | Backend | — | ☐ |

Mark each module's individual **Acceptance Criteria** (in Section 5) as done before flipping the module to `Done` in this table — don't mark modules complete on "the endpoints exist," require the business rules to be enforced too.

---

## 5. Modules — Detailed Specification

Each module below is self-contained: scope, data touched, endpoints, business rules, acceptance criteria. Endpoints are namespaced `/api/public/*` (unauthenticated or end-user-authenticated) vs `/api/admin/*` (staff-authenticated, role-gated).

---

### Module A — Public Landing / Show Information
**Status:** ☐ | **Depends on:** none

**Scope:** Marketing/info site — header, hero, show highlights, testimonials (future), footer.

**Endpoints:**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/public/landing` | CMS-driven content: hero copy, highlights, countries, eligibility, rewards |

**Acceptance criteria:**
- [ ] Page loads in <3s (see NFRs).
- [ ] "Register Now" CTA routes into Module B.
- [ ] Content is editable without a code deploy (recommend a lightweight CMS table or headless CMS — flag as open decision).
- [ ] Responsive on mobile/tablet/desktop; WCAG 2.1 AA.

---

### Module B — Registration & Application Flow
**Status:** ☐ | **Depends on:** Module H

**Scope:** Three-step funnel: basic info → payment (Module C) → completion info + photo upload. This is the flow that **creates the row later managed as a "Contestant" in Module J** — see Gap #1.

**Data model — `users` / `contestants`:**
```
users
  id, email (unique), phone, password_hash|otp_ref, full_name,
  registration_date, account_status(active|blocked),
  created_at, updated_at

contestants  (1:1 with users, created once application is submitted)
  id, user_id (fk), height, profile_photo_url, location,
  background_info, application_answers (jsonb),
  emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
  health_info, travel_experience,
  current_stage, status(active|eliminated|withdrawn),
  application_date, created_at, updated_at

contestant_stage_history
  id, contestant_id (fk), from_stage, to_stage, changed_by(admin_id), changed_at
```

**Endpoints:**
| Method | Endpoint | Purpose | Required Fields |
|---|---|---|---|
| POST | `/api/public/register/basic-info` | Step 1: create user + draft application | first_name, last_name, age, gender, nationality, country_of_residence, email, phone, "why join" answer |
| GET | `/api/public/register/continuation?userId=` | Fetch state to resume step 3 after payment | user_id |
| POST | `/api/public/register/complete` | Step 3: finalize application, creates `contestants` row | social links, occupation, emergency contact (name/relationship/phone), health info, travel experience, profile photo |
| POST | `/api/public/upload/photo` | Photo upload (used by step 3) | multipart file |

**Business rules:**
| ID | Rule |
|---|---|
| REG-001 | Email must be unique across `users` (mirrors USR-001). |
| REG-002 | Step 3 cannot be submitted until Module C payment is confirmed for this user. |
| REG-003 | A `contestants` row is created **only** on successful completion of step 3 — this is the moment a `user` becomes a "contestant" (see Gap #1). |
| REG-004 | New contestants default to `current_stage = Stage 1`, `status = active`. |
| REG-005 | Basic validation on all required fields; email format validation; file type/size validation on photo upload. |

**Acceptance criteria:**
- [ ] User can complete step 1 with validation errors shown inline.
- [ ] User is blocked from step 3 without confirmed payment (REG-002 enforced server-side, not just UI).
- [ ] Duplicate email registration is rejected with a clear error.
- [ ] Successful step 3 submission produces exactly one `contestants` row visible in Module J's admin list.

---

### Module C — Payment Processing
**Status:** ☐ | **Depends on:** Module B

**Scope:** Country-aware payment gateway selection and processing, sitting behind one internal interface so gateways can be added/removed without touching business logic.

**Payment partners (from source doc):**
- NGN: Flutterwave, Paystack
- USD: PayPal, Apple Pay, Google Pay (via Stripe), Stripe
- Crypto: Coinbase Commerce

**Data model — `payments`:**
```
payments
  id, user_id (fk), provider, provider_ref, amount, currency,
  status(pending|success|failed|refunded), country,
  created_at, confirmed_at
```

**Endpoints:**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/public/payment/gateway-options?country=` | Return available gateways for a country |
| POST | `/api/public/payment/process` | Initiate payment (amount, country, method, user_id) |
| POST | `/api/public/payment/webhook/:provider` | Provider webhook — **source of truth for payment confirmation**, not the client callback |
| GET | `/api/public/payment/:paymentId/status` | Poll status from frontend |

**Business rules:**
| ID | Rule |
|---|---|
| PAY-001 | Payment confirmation must be driven by the **provider's server-to-server webhook**, never solely by the browser redirect, to prevent spoofed "success" states. |
| PAY-002 | Payment processing must complete/confirm status within 5s of submission (NFR), independent of async webhook confirmation latency — show a "processing" state if needed. |
| PAY-003 | All payment data transmission over TLS; PCI-DSS scope minimized by using hosted checkout/redirect flows from providers rather than collecting card data directly. |
| PAY-004 | Failed payments must not create a `contestants` row and must allow retry. |
| PAY-005 | If a gateway is down, the country's gateway list should degrade gracefully to remaining available options (fallback mitigation from source doc's risk section). |

**Acceptance criteria:**
- [ ] Each configured gateway can be selected per country and completes a full sandbox transaction.
- [ ] Webhook handler is idempotent (duplicate webhook delivery doesn't double-charge or double-confirm).
- [ ] Payment success triggers Module D confirmation email within 5 minutes.

---

### Module D — Transactional Email
**Status:** ☐ | **Depends on:** Modules B, C

**Scope:** Payment confirmation and registration completion emails; queued, not sent inline in the request path.

**Endpoints (internal/queue-triggered, not typically client-called directly):**
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/internal/email/send-payment-confirmation` | Triggered by PAY webhook success |
| POST | `/api/internal/email/send-registration-confirmation` | Triggered by REG step-3 completion |

**Business rules:**
| ID | Rule |
|---|---|
| EML-001 | Emails are queued (Redis/BullMQ) and retried on failure, not sent synchronously in the request/response cycle. |
| EML-002 | Sending domain must be verified (SPF/DKIM/DMARC) to reduce spam-folder placement. |
| EML-003 | Delivery target: within 5 minutes of triggering event. |

**Acceptance criteria:**
- [ ] Both templates render correctly with real data (amount, contestant details).
- [ ] Failed sends retry at least 3x with backoff and land in a dead-letter log for manual follow-up.

---

### Module E — Public Voting
**Status:** ☐ | **Depends on:** Modules F/H | ⚠️ **Not specified in either source doc — see Gap #2**

**Scope:** The public-facing counterpart to Admin's Voting Management (Module K). Registered users cast votes for active contestants in the current voting cycle.

**Data model — `voting_cycles` / `votes`:**
```
voting_cycles
  id, started_by(admin_id), started_at, closed_at, status(active|closed)

votes
  id, cycle_id (fk), contestant_id (fk), user_id (fk, voter),
  cast_at, ip_address
```

**Endpoints:**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/public/voting/current` | Active cycle + eligible contestants + live counts |
| POST | `/api/public/voting/contestants/:contestantId/vote` | Cast a vote |

**Business rules:**
| ID | Rule |
|---|---|
| PVOT-001 | A vote must reference an `active` voting cycle and a non-eliminated contestant (aligns with VOT-004). |
| PVOT-002 | Rate-limit / one-vote-per-user-per-cycle (or per-day, if multiple votes are allowed by design — **needs product decision**, see Gap #2). |
| PVOT-003 | Votes are immutable once cast; never hard-deleted (aligns with VOT-003 and the doc's "no permanent deletes" principle). |

**Acceptance criteria:**
- [ ] Voting is rejected once a contestant is eliminated (real-time, not just UI-hidden).
- [ ] Vote counts shown in Module K's admin dashboard match `votes` table counts exactly.

---

### Module F — Public Trivia Participation
**Status:** ☐ | **Depends on:** Module H | ⚠️ Not specified in either source doc — see Gap #2

**Scope:** Users answer the active trivia question(s) created in Module L.

**Data model — `trivia_answers`:**
```
trivia_answers
  id, trivia_id (fk), user_id (fk), selected_option, is_correct,
  answered_at
```

**Endpoints:**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/public/trivia/active` | Currently active trivia question(s) |
| POST | `/api/public/trivia/:triviaId/answer` | Submit an answer |

**Business rules:**
| ID | Rule |
|---|---|
| PTRI-001 | Only trivia with `status = Active` and within its `period` window is answerable (aligns with TRI-004). |
| PTRI-002 | One answer per user per trivia question. |
| PTRI-003 | Once a user has answered, TRI-005's restriction applies: correct-answer changes on that trivia must be audit logged. |

**Acceptance criteria:**
- [ ] Answering after the period closes is rejected server-side.
- [ ] Result screen only reveals correct answer per product decision (immediately vs. after period close — **needs product decision**).

---

### Module G — Public Spin-the-Wheel Gameplay
**Status:** ☐ | **Depends on:** Module H | ⚠️ Not specified in either source doc — see Gap #2

**Scope:** Users spin the wheel and are awarded one of the 10 configured prize slots (Module M manages configuration; this module is the actual gameplay/award event).

**Data model — `prize_awards`:**
```
prize_awards
  id, user_id (fk), prize_id (fk), prize_snapshot (jsonb — name/description at time of award),
  awarded_at
```
> `prize_snapshot` exists because SWT-005/SWT-006 require prize edits to never alter historical award records — store a copy, not just a reference.

**Endpoints:**
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/public/spin-wheel/spin` | Execute a spin, returns awarded prize |
| GET | `/api/public/spin-wheel/my-history` | User's own award history |

**Business rules:**
| ID | Rule |
|---|---|
| PSW-001 | Spin selection logic runs **server-side only** (weighted random against active, in-stock prize slots) — never trust a client-submitted result. |
| PSW-002 | Eligibility to spin (e.g., once per day, tied to subscription) — **needs product decision**. |
| PSW-003 | A prize with a finite `quantity` cannot be awarded past its stock (needs a decrement + row lock to avoid race conditions on concurrent spins). |

**Acceptance criteria:**
- [ ] Concurrent spins near the last unit of a limited prize never over-award (load-test this).
- [ ] Awarded prize detail is immutable even after the admin edits/deactivates that prize slot later.

---

### Module H — Auth, RBAC & Sessions (shared)
**Status:** ☐ | **Depends on:** none — build first

**Scope:** Two distinct auth domains sharing one mechanism style:
- **Public users:** email/password or OTP login, JWT access+refresh tokens.
- **Admin staff:** email/password (+ optional 2FA), JWT, role-based permissions per module.

**Data model:**
```
admin_users
  id, email, password_hash, role, is_active, created_at

roles/permissions (or a simple enum-based role table)
  role: super_admin | user_manager | contestant_manager | voting_manager |
        trivia_manager | prize_manager  (mix-and-match per staff member)

sessions
  id, subject_type(user|admin), subject_id, token_hash, expires_at, ip_address
```

**Endpoints:**
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/public/auth/register` \| `/login` \| `/refresh` | Public user auth |
| POST | `/api/admin/auth/login` \| `/refresh` \| `/logout` | Admin auth |
| GET | `/api/admin/auth/me` | Current admin + permissions |

**Business rules:**
| ID | Rule |
|---|---|
| AUTH-001 | Admin must authenticate before accessing any `/api/admin/*` route. |
| AUTH-002 | Role determines accessible modules/actions (RBAC middleware/guard on every admin route). |
| AUTH-003 | Sessions expire after a configurable inactivity period (default suggestion: 30 min admin, 7 days public refresh token). |
| AUTH-004 | Blocked users (USR-003) cannot access any authenticated public endpoint — enforce in a global guard, not per-endpoint. |

**Acceptance criteria:**
- [ ] Every `/api/admin/*` route rejects unauthenticated requests with 401.
- [ ] A `voting_manager`-only admin gets 403 hitting `/api/admin/trivia/*`.
- [ ] Blocked user gets 403 on any authenticated public route immediately after being blocked (no stale-token bypass beyond token TTL).

---

### Module I — Admin: User Management
**Status:** ☐ | **Depends on:** Module H

**Scope:** As specified in source Section 2 — user list, summary cards (Total/Paid/Non-Subscribed), user detail view, block/unblock.

**Endpoints:** *(from source, unchanged)*
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/users/:userId` | User details |
| PATCH | `/api/admin/users/:userId/block` | Block user |
| PATCH | `/api/admin/users/:userId/unblock` | Unblock user |
| GET | `/api/admin/users/:userId/subscription` | Subscription info |
| GET | `/api/admin/users/stats` | Summary stats |

**Business rules:** USR-001 through USR-006 (see source doc — unchanged, carried over verbatim).

**Acceptance criteria:**
- [ ] Blocking a user does not delete any row (USR-004) — verify via DB inspection, not just UI.
- [ ] Block/unblock action produces an Module N audit log entry (USR-006).
- [ ] Paid vs Non-Subscribed classification recalculates correctly when a subscription expires (needs a scheduled job or computed-on-read logic — flag as implementation decision).

---

### Module J — Admin: Contestants Management
**Status:** ☐ | **Depends on:** Modules B, H

**Scope:** As specified in source Section 3 — contestant list, stage summary cards, detail view, stage management with confirmation.

**Endpoints:** *(from source, unchanged)*
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/contestants` | List |
| GET | `/api/admin/contestants/stats` | Stage counts |
| GET | `/api/admin/contestants/:contestantId` | Details |
| GET | `/api/admin/contestants/:contestantId/history` | Stage history |
| PATCH | `/api/admin/contestants/:contestantId/stage` | Move stage |
| PATCH | `/api/admin/contestants/:contestantId/status` | Update status |

**Business rules:** CON-001 through CON-008 (unchanged from source). Note CON-008: stage names configurable — recommend a `competition_stages` config table (`id, name, order`) rather than a hardcoded enum, referenced by `contestants.current_stage`.

**Acceptance criteria:**
- [ ] Stage move requires explicit confirmation step in UI and writes to `contestant_stage_history`.
- [ ] Attempting to skip a stage (e.g., Stage 1 → Stage 3 directly) is rejected server-side per CON-003 unless product explicitly allows skips.
- [ ] Withdrawn/eliminated contestants remain queryable via history endpoints (CON-006/007).

---

### Module K — Admin: Voting Management
**Status:** ☐ | **Depends on:** Modules E, J, H

**Scope:** As specified in source Section 4 — voting list, start new cycle, eliminate contestant.

**Endpoints:** *(from source, unchanged)*
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/voting/current` | Current cycle |
| GET | `/api/admin/voting/contestants` | Contestants + vote counts |
| GET | `/api/admin/voting/cycles` | Past cycles |
| GET | `/api/admin/voting/cycles/:cycleId` | Cycle detail |
| POST | `/api/admin/voting/cycles` | Start new cycle |
| POST | `/api/admin/voting/contestants/:contestantId/eliminate` | Eliminate |
| GET | `/api/admin/voting/contestants/:contestantId/votes` | Voting history |

**Business rules:** VOT-001 through VOT-009 (unchanged from source).

**Acceptance criteria:**
- [ ] Starting a new cycle archives (not deletes) the previous cycle's votes — verify old `votes` rows still exist with the old `cycle_id`.
- [ ] Eliminating a contestant immediately blocks new votes for them in Module E (test the public endpoint right after elimination).
- [ ] Only one `active` cycle exists at a time (DB constraint or application-level lock, per VOT-005).

---

### Module L — Admin: Trivia Management
**Status:** ☐ | **Depends on:** Module H

**Scope:** As specified in source Section 5 — trivia CRUD, configurable option count.

**Endpoints:** *(from source, unchanged)*
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/trivia` | List |
| GET | `/api/admin/trivia/:triviaId` | Detail |
| POST | `/api/admin/trivia` | Create |
| PATCH | `/api/admin/trivia/:triviaId` | Update |
| DELETE | `/api/admin/trivia/:triviaId` | Delete |
| PATCH | `/api/admin/trivia/:triviaId/status` | Activate/deactivate |

**Business rules:** TRI-001 through TRI-006 (unchanged from source).

**Data model — `trivia`:**
```
trivia
  id, question, period_start, period_end, options (jsonb array),
  correct_option_index, status(draft|active|closed), created_by, created_at

trivia_answer_change_log   -- required by TRI-005 once answers exist
  id, trivia_id, old_correct_option, new_correct_option, changed_by, changed_at
```

**Acceptance criteria:**
- [ ] `DELETE` is soft-delete or blocked once any `trivia_answers` exist (conflicts with TRI-006 "retain history" — see Gap #3).
- [ ] Changing the correct answer after answers exist writes to `trivia_answer_change_log` (TRI-005), and ideally requires a confirmation dialog.

---

### Module M — Admin: Spin the Wheel Management
**Status:** ☐ | **Depends on:** Module H

**Scope:** As specified in source Section 6 — 10 prize slots, CRUD, activate/deactivate.

**Endpoints:** *(from source, unchanged)*
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/spin-wheel/prizes` | List |
| GET | `/api/admin/spin-wheel/prizes/:prizeId` | Detail |
| POST | `/api/admin/spin-wheel/prizes` | Add |
| PATCH | `/api/admin/spin-wheel/prizes/:prizeId` | Update |
| DELETE | `/api/admin/spin-wheel/prizes/:prizeId` | Remove |
| PATCH | `/api/admin/spin-wheel/prizes/:prizeId/status` | Activate/deactivate |

**Business rules:** SWT-001 through SWT-006 (unchanged from source).

**Data model — `prizes`:**
```
prizes
  id, position (1-10, unique in active set), name, description,
  quantity (nullable = unlimited), status(active|inactive),
  updated_by, updated_at
```

**Acceptance criteria:**
- [ ] `position` uniqueness enforced at the DB level (SWT-002), not just app validation.
- [ ] Editing a prize's name/description does not alter any existing `prize_awards.prize_snapshot` (SWT-005/006) — this is the test that actually proves the snapshot design works.
- [ ] `DELETE` is disallowed (or soft-delete only) if the prize has historical awards — hard delete would orphan `prize_awards`.

---

### Module N — Audit Logging (shared infrastructure)
**Status:** ☐ | **Depends on:** none — build alongside Module H

**Scope:** Cross-cutting requirement from source Section 7 — every state-changing admin action recorded.

**Data model — `audit_logs`:**
```
audit_logs
  id, admin_id, action, module(user|contestant|voting|trivia|spin_wheel),
  target_type, target_id, previous_value (jsonb), new_value (jsonb),
  ip_address, created_at
```

**Recommended implementation:** a single NestJS interceptor/decorator applied to all mutating admin routes, rather than hand-writing log calls in every controller — reduces the risk of a module shipping without logging (this is the most commonly-missed requirement in practice).

**Endpoints:**
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/audit-logs` | List/filter audit entries (by module, admin, date range, target) |

**Acceptance criteria:**
- [ ] Every mutating endpoint across Modules I–M produces exactly one audit entry per action.
- [ ] `previous_value`/`new_value` are populated (not just "user blocked" with no before/after state).
- [ ] Audit logs are append-only — no `UPDATE`/`DELETE` route or DB permission exists for this table.

---

### Module O — Data Model & Migrations
**Status:** ☐ | **Depends on:** none — build first, alongside Module H

**Scope:** Formal schema + migration tooling underlying every module above.

**Deliverable:** a single ERD covering `users`, `contestants`, `contestant_stage_history`, `payments`, `voting_cycles`, `votes`, `trivia`, `trivia_answers`, `trivia_answer_change_log`, `prizes`, `prize_awards`, `admin_users`, `audit_logs`, `competition_stages` (config table), plus migration files (Prisma/TypeORM/Knex — pick one and standardize).

**Acceptance criteria:**
- [ ] ERD reviewed and approved before Modules B/I–M begin (prevents rework).
- [ ] Foreign keys and unique constraints match the business rules called out per module (e.g., unique email, unique prize position, one active voting cycle).
- [ ] Migrations are reversible and run cleanly on a fresh database.

---

## 6. Non-Functional Requirements (system-wide)

| Category | Requirement |
|---|---|
| Performance | Page load <3s; payment confirmation <5s of submission |
| Scalability | Support 10,000 concurrent users during peak registration/voting windows |
| Security | TLS everywhere; PCI-DSS-conscious payment handling (hosted checkout, no raw card storage); encrypted data at rest for PII |
| Accessibility | WCAG 2.1 AA on the public site |
| Availability | Admin and public API should be independently deployable/scalable — voting traffic spikes shouldn't take down admin access |
| Auditability | No hard deletes of votes, stage history, prize records, or user accounts anywhere in the system |

---

## 7. Cross-Platform Admin Requirements (carried over)

Applies to all admin modules (I–M), enforced via Module H/N:
- Admin authentication required for all admin routes.
- Role-based access per module.
- Configurable session inactivity expiry.
- Audit logging on all state-changing actions.
- Confirmation dialogs required before destructive/high-impact actions (stage moves, elimination, new voting cycle, prize deletion).

---

## 8. Gap & Conflict Log — decisions needed before/while building

These are things a senior review of both source docs surfaces. Resolve these with the product owner; they affect the data model in Section 5, so resolving them early avoids rework.

| # | Gap/Conflict | Why it matters | Recommendation |
|---|---|---|---|
| 1 | The Admin doc treats "Contestant" as an existing entity with stages/status; the Registration doc never explicitly creates a "Contestant" record — only a "User" who submits an application. | Without a defined transition point, Admin's Contestant list has no clear source. | Module B, REG-003: a `contestants` row is created at successful completion of the 3-step registration flow. Confirm this matches actual product intent (e.g., is a screening/approval step needed before someone counts as a "contestant," or is application = contestant automatically?). |
| 2 | The Registration doc has no public endpoints for **voting, trivia, or spin-the-wheel** — only Admin-side management of these exists. | Admin can create trivia and configure prizes and monitor votes, but there's no spec for how end users actually vote/play. | Added Modules E, F, G as the missing public-facing counterparts. These need full product requirements (eligibility rules, rate limits, whether voting/trivia require a paid subscription) — currently only scaffolded from the Admin doc's implied behavior. |
| 3 | TRI-006 says "trivia history should be retained after the period ends," but the Trivia table's Actions column includes "Delete." | Hard delete conflicts with "retain history" once answers exist. | Module L: delete should be blocked/soft-delete once `trivia_answers` exist for that trivia. |
| 4 | "Paid Users" (Module I) references "active subscription," but no subscription/billing module exists in either source doc. | Can't compute Paid vs Non-Subscribed without a subscription data model. | Needs a `subscriptions` table and its own mini-spec (plan, price, start/expiry, payment link) — currently out of scope of both source docs; flag to product owner as a likely missing module. |
| 5 | Registration doc lists MongoDB **or** PostgreSQL; Admin doc's requirements (audit trails, history tables, no-delete, cross-entity relations) fit a relational model much better. | Picking wrong here is expensive to reverse later. | Recommendation in Section 3: PostgreSQL, decided now rather than left open. |
| 6 | Payment webhook handling and idempotency aren't mentioned in the original registration PRD — only client-driven "payment confirmation." | Client-only confirmation is spoofable; a user could hit the completion endpoint without actually paying. | PAY-001: server-to-server webhook is the source of truth, added in Module C. |
| 7 | Contestant stage skipping (CON-003 "only next eligible stage") isn't explicit about whether stages can ever move backward (e.g., disqualification reversal). | Affects whether `stage` transition validation is a simple "current+1" check or needs a full state machine. | Flag to product owner; Module J's acceptance criteria assumes forward-only unless told otherwise. |

---

## 9. Suggested Build Order

1. **Module O** (data model) + **Module H** (auth/RBAC) + **Module N** (audit logging) — foundation, nothing else should start before these are at least scaffolded.
2. **Module B + C + D** (registration → payment → email) — the core public funnel; also produces the `contestants` data Module J needs to be testable.
3. **Module I + J** (Admin: users, contestants) — can be built in parallel with step 2 once Module O's schema is fixed.
4. **Module E + K** (public voting + admin voting) together — they share the same tables and business rules, build as one workstream.
5. **Module F + L** (trivia) and **Module G + M** (spin-the-wheel) — lowest priority (P1 in the original doc), build last, can run in parallel with each other.
6. **Module A** (landing page) — can happen anytime in parallel; no backend dependency beyond a simple content endpoint.

---

## 10. MVP Priority (carried over from source, mapped to modules)

| Priority | Modules | Reason |
|---|---|---|
| P0 | H, N, O, B, C, D, I, J | Core funnel + admin control — nothing works without these |
| P0 | E, K | Core reality-show engagement mechanism |
| P1 | F, L | Engagement feature |
| P1 | G, M | Gamification/rewards feature |

---

*End of document. Update the Module Status Tracker (Section 4) as work lands, and resolve the Gap & Conflict Log (Section 8) items with the product owner before those modules are marked "Done."*
