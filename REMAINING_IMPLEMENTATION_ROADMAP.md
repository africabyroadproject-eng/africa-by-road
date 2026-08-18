# Africa By Road — Remaining Implementation Roadmap

**Date:** August 17, 2026
**Status:** Post Module K (Admin Voting Management) completion
**Author:** Implementation Architect

---

## What Was Just Completed (Module K + Partial E + Partial H)

| Item | Status | Files Changed |
|------|--------|---------------|
| RBAC Guard infrastructure (`@Roles()` + `RolesGuard`) | ✅ Done | `roles.decorator.ts`, `roles.guard.ts` |
| Admin role expansion (7 granular roles) | ✅ Done | `admin.schema.ts`, `token-payload.interface.ts`, `admin-auth.guard.ts` |
| VotingCycle schema + partial unique index | ✅ Done | `voting-cycle.schema.ts` |
| Contestant stage + elimination fields | ✅ Done | `contestant.schema.ts` |
| Vote → VotingCycle reference | ✅ Done | `vote.schema.ts` |
| Public vote cycle enforcement (PVOT-001) | ✅ Done | `vote.service.ts` |
| Admin Voting Controller (7 endpoints) | ✅ Done | `admin-voting.controller.ts` |
| Admin Voting Service (full business logic) | ✅ Done | `admin-voting.service.ts` |
| DTOs (StartCycle, EliminateContestant) | ✅ Done | `start-cycle.dto.ts`, `eliminate-contestant.dto.ts` |
| Audit service enhancement | ✅ Done | `audit.service.ts` |
| Tests updated + passing (23/23) | ✅ Done | `vote.service.spec.ts` |

---

## Remaining Work — Ordered by Priority & Dependency

### Legend
- **P0** = Critical / Immediate (blocks core user flows)
- **P1** = Important (blocks admin operations or compliance)
- **P2** = Enhancement (improves UX/DX but not blocking)

---

## PHASE 1: Public Feature Fixes (P0)

These fix broken or incomplete public-facing features. Should be done **first** since they affect end users.

### 1.1 — Module A: Restore Public Landing Page
| Aspect | Detail |
|--------|--------|
| **Surface** | Frontend |
| **Effort** | ~2-3 hours |
| **What** | `app/page.tsx` currently redirects to `/login`. Replace with a marketing landing page using data from `GET /api/public/landing-page` |
| **Backend dependency** | None — endpoint exists |
| **Files to change** | `app/page.tsx` (rewrite), create `components/landing/*` |

### 1.2 — Module B: Registration Fields + File Uploads
| Aspect | Detail |
|--------|--------|
| **Surface** | Frontend + Backend |
| **Effort** | ~4-6 hours |
| **What (Frontend)** | Add missing form fields: `height`, `emergency_contact_*`, `health_info`, `travel_experience`. Replace `/placeholder.svg` with real S3/Cloudinary binary uploads. |
| **What (Backend)** | Add the missing fields to the Tourist schema. Create `contestants` collection with `current_stage = Stage 1` auto-population on step 3. Optionally refactor to 3-step funnel endpoints. |
| **Files to change (BE)** | `tourist.schema.ts`, new `contestant-registration.service.ts` |
| **Files to change (FE)** | `app/registration/continue/page.tsx`, `features/registration/schemas.ts` |

### 1.3 — Module G: Database-Driven Spin Prizes (🚨 CRITICAL)
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend |
| **Effort** | ~3-4 hours |
| **What** | Replace hardcoded `SPIN_PRIZES` array in `giveaway.service.ts` with a `prizes` database collection. Implement weighted random selection, atomic stock decrements (`$inc: { quantity: -1 }`), and immutable `prize_snapshot` records. |
| **New files** | `prize.schema.ts`, `prize-snapshot.schema.ts` |
| **Files to change** | `giveaway.service.ts`, `giveaway.module.ts` |
| **Dependency** | Module M (Admin Spin Management) will manage these prize slots |

### 1.4 — Module D: Async Email Queue
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend |
| **Effort** | ~3-4 hours |
| **What** | Install `@nestjs/bull` + `bull` + `ioredis`. Create `EmailProcessor` queue worker. Refactor `email.service.ts` to enqueue jobs instead of sending synchronously. Add payment confirmation and registration completion email templates. |
| **New dependencies** | `@nestjs/bull`, `bull`, `ioredis` |
| **New files** | `email.processor.ts`, `email.module.ts` |
| **Environment** | Requires Redis connection string in `.env` |

---

## PHASE 2: Public Gamification Completion (P0)

These complete the core competition mechanics that are partially built.

### 2.1 — Module E: Voting Cycle Frontend
| Aspect | Detail |
|--------|--------|
| **Surface** | Frontend |
| **Effort** | ~2-3 hours |
| **What** | Handle the new "No active voting cycle" error in `app/vote/page.tsx`. Add a cycle status banner/countdown. Optionally add real-time polling for live vote tallies. |
| **Backend dependency** | ✅ Already done (this sprint) |

### 2.2 — Module F: Trivia Time Windows
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend + Frontend |
| **Effort** | ~2-3 hours |
| **What (Backend)** | Add `period_start` and `period_end` Date fields to `TriviaQuestion` schema. Add server-side validation in `submitTriviaAnswer()` to reject answers outside the window. |
| **What (Frontend)** | Add countdown timer in `app/giveaways/page.tsx` showing remaining time. Build trivia answer history view. |
| **Files to change (BE)** | `trivia-question.schema.ts`, `giveaway.service.ts` |

### 2.3 — Module C: Payment SDK Integrations
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend + Frontend |
| **Effort** | ~6-8 hours (per provider) |
| **What (Backend)** | Create `payments` collection for ledger tracking. Implement Paystack, Flutterwave, Stripe SDK integrations behind the existing `PaymentProvider` interface. Add idempotent webhook handling. |
| **What (Frontend)** | Embed Paystack Inline JS, Flutterwave Inline, and Stripe Elements widgets in `app/registration/continue/page.tsx`. |
| **New dependencies (BE)** | `stripe`, `flutterwave-node-v3`, `paystack` SDKs |

---

## PHASE 3: Admin Platform Backend APIs (P1)

These build the remaining admin module controllers. The RBAC infrastructure (`RolesGuard`, `@Roles()`, expanded admin roles) is **already in place** from this sprint.

### 3.1 — Module I: Admin User Management
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend |
| **Effort** | ~3-4 hours |
| **Endpoints** | `GET /api/admin/users` (paginated list), `GET /api/admin/users/:id` (detail), `PATCH /api/admin/users/:id/block` (toggle block), `GET /api/admin/users/stats` (summary cards) |
| **Role required** | `user_manager` |
| **Depends on** | Tourist schema (exists), RolesGuard (✅ done) |
| **Pattern** | Follow the same controller/service pattern as `admin-voting.controller.ts` |

### 3.2 — Module J: Admin Contestants Management
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend |
| **Effort** | ~4-5 hours |
| **Endpoints** | `GET /api/admin/contestants` (list with stage summary), `GET /api/admin/contestants/:id` (detail), `PATCH /api/admin/contestants/:id/stage` (move stage), `PATCH /api/admin/contestants/:id/status` (update status), `GET /api/admin/contestants/:id/history` (stage history) |
| **Role required** | `contestant_manager` |
| **Depends on** | Contestant schema (✅ enhanced this sprint with `currentStage` field) |

### 3.3 — Module L: Admin Trivia Management
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend |
| **Effort** | ~3-4 hours |
| **Endpoints** | `GET /api/admin/trivia` (list), `POST /api/admin/trivia` (create), `PATCH /api/admin/trivia/:id` (update), `DELETE /api/admin/trivia/:id` (delete), `PATCH /api/admin/trivia/:id/toggle` (active/inactive) |
| **Role required** | `trivia_manager` |
| **Extra** | Create `trivia_answer_change_log` to track when correct answers change after submissions exist (TRI-005) |

### 3.4 — Module M: Admin Spin-the-Wheel Management
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend |
| **Effort** | ~3-4 hours |
| **Endpoints** | `GET /api/admin/spin-wheel/prizes` (list 10 slots), `POST /api/admin/spin-wheel/prizes` (create), `PATCH /api/admin/spin-wheel/prizes/:id` (update stock/name), `DELETE /api/admin/spin-wheel/prizes/:id` (remove), `PATCH /api/admin/spin-wheel/prizes/:id/toggle` (active/inactive) |
| **Role required** | `prize_manager` |
| **Depends on** | Prize schema from Phase 1.3 (Module G refactor) |

### 3.5 — Module N: Audit Log DB Persistence
| Aspect | Detail |
|--------|--------|
| **Surface** | Backend |
| **Effort** | ~3-4 hours |
| **What** | Create `AuditLog` Mongoose schema. Replace `AuditService.logAdminAction()` stdout logging with DB inserts. Create NestJS Interceptor to auto-capture before/after diffs. Add `GET /api/admin/audit-logs` endpoint with filters (module, admin, date range). |
| **Depends on** | `AuditService.logAdminAction()` (✅ enhanced this sprint) |

---

## PHASE 4: Admin Frontend SPA (P1)

### 4.1 — Admin Shell & Login
| Aspect | Detail |
|--------|--------|
| **Surface** | Frontend |
| **Effort** | ~4-6 hours |
| **What** | Create `/app/admin/login` page. Build admin layout shell with sidebar navigation. Implement admin route guards using `adminToken` cookie. |

### 4.2 — Admin Voting Dashboard
| Aspect | Detail |
|--------|--------|
| **Surface** | Frontend |
| **Effort** | ~4-6 hours |
| **What** | Build the voting management UI using the 7 endpoints from the integration guide. Components: Active Cycle Card, Contestant Vote Table, Cycle History, Start/Close modals, Eliminate confirmation. |
| **Backend dependency** | ✅ Already done (this sprint) |

### 4.3 — Admin User & Contestant Dashboards
| Aspect | Detail |
|--------|--------|
| **Surface** | Frontend |
| **Effort** | ~6-8 hours |
| **What** | Build user listing/detail pages, contestant stage management UI with drag-to-move or dropdown stage selectors, block/unblock toggles. |
| **Backend dependency** | Modules I & J (Phase 3) |

### 4.4 — Admin Trivia & Spin Management
| Aspect | Detail |
|--------|--------|
| **Surface** | Frontend |
| **Effort** | ~4-6 hours |
| **What** | Trivia CRUD forms with preview, Spin prize slot configurator (10 slots with stock/weight editors), active/inactive toggles. |
| **Backend dependency** | Modules L & M (Phase 3) |

### 4.5 — Audit Log Viewer
| Aspect | Detail |
|--------|--------|
| **Surface** | Frontend |
| **Effort** | ~2-3 hours |
| **What** | Filterable table of admin actions. Filters: module, admin user, date range, action type. JSON diff viewer for before/after values. |
| **Backend dependency** | Module N (Phase 3) |

---

## Estimated Total Effort Summary

| Phase | Scope | Estimated Hours | Priority |
|-------|-------|-----------------|----------|
| **Phase 1** | Public Feature Fixes | 12-17 hours | P0 |
| **Phase 2** | Public Gamification | 10-14 hours | P0 |
| **Phase 3** | Admin Backend APIs | 16-21 hours | P1 |
| **Phase 4** | Admin Frontend SPA | 20-29 hours | P1 |
| **Total** | | **58-81 hours** | |

---

## Recommended Sprint Assignments

```
Sprint 1 (Week 1): Phase 1 — Public Fixes
  Backend Dev:  1.3 (Spin prizes DB), 1.4 (Email queue)
  Frontend Dev: 1.1 (Landing page), 1.2 (Registration fields)

Sprint 2 (Week 2): Phase 2 — Gamification
  Backend Dev:  2.2 (Trivia time windows), 2.3 (Payment SDKs — start)
  Frontend Dev: 2.1 (Voting cycle UI), 2.2 (Trivia countdown)

Sprint 3 (Week 3): Phase 3 — Admin APIs
  Backend Dev:  3.1 (User mgmt), 3.2 (Contestants), 3.3 (Trivia admin)
  Backend Dev:  3.4 (Spin admin), 3.5 (Audit logs)

Sprint 4 (Week 4): Phase 4 — Admin Frontend
  Frontend Dev: 4.1 (Admin shell), 4.2 (Voting dashboard)
  Frontend Dev: 4.3 (User/Contestant dashboards), 4.4 (Trivia/Spin)
  Frontend Dev: 4.5 (Audit viewer)
```

---

## Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │    ✅ COMPLETED THIS SPRINT          │
                    │    RBAC Guard + VotingCycle +        │
                    │    Admin Voting API (Module K)       │
                    └────────────┬────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────────┐
              ▼                  ▼                      ▼
     ┌────────────────┐  ┌──────────────┐   ┌──────────────────┐
     │ Phase 1        │  │ Phase 2      │   │ Phase 3          │
     │ Public Fixes   │  │ Gamification │   │ Admin APIs       │
     │ (A, B, G, D)   │  │ (E, F, C)    │   │ (I, J, L, M, N) │
     └───────┬────────┘  └──────┬───────┘   └────────┬─────────┘
             │                  │                     │
             │         ┌───────┘                      │
             ▼         ▼                              ▼
     ┌──────────────────────────────────────────────────────┐
     │                  Phase 4                              │
     │          Admin Frontend SPA                           │
     │   (Login, Voting Dashboard, User/Contestant,          │
     │    Trivia/Spin Management, Audit Viewer)              │
     └──────────────────────────────────────────────────────┘
```

> **Note:** Phases 1, 2, and 3 can be worked on in **parallel** by different developers. Phase 4 depends on Phase 3 for admin API availability.
