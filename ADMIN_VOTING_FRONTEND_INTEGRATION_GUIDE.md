# Admin Voting Management — Frontend Integration Guide

**Date:** August 17, 2026
**Backend Module:** Module K — Admin Voting Management (fully implemented)
**Base URL:** `{API_HOST}/api`

---

## Authentication

All admin voting endpoints require an **admin JWT token** in one of:
- Cookie: `adminToken`
- Header: `Authorization: Bearer <admin-jwt-token>`

**Required Role:** `voting_manager`, `admin`, or `superadmin`

> **⚠️ IMPORTANT:** These endpoints are **admin-only**. They will return `403 Forbidden` if accessed with a regular tourist token. The admin login endpoint (to be built in Module H frontend) issues a separate admin JWT.

---

## TypeScript Types

Copy these types directly into your frontend services:

```typescript
// ─── Admin Roles ───
type AdminRole =
  | 'superadmin'
  | 'admin'
  | 'user_manager'
  | 'contestant_manager'
  | 'voting_manager'
  | 'trivia_manager'
  | 'prize_manager';

// ─── Voting Cycle ───
interface VotingCycle {
  _id: string;
  name: string;
  status: 'pending' | 'active' | 'closed';
  startedAt: string;       // ISO 8601 date
  closedAt?: string;       // ISO 8601 date (only when closed)
  createdBy: string;       // Admin ObjectId
  createdAt: string;
  updatedAt: string;
}

// ─── Contestant Stage ───
type ContestantStage = 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Final';
type ContestantStatus = 'pending' | 'active' | 'eliminated' | 'winner';

// ─── Vote Tally (per cycle) ───
interface CycleTally {
  contestantId: string;
  name: string;
  country: string;
  imageUrl: string;
  status: ContestantStatus;
  currentStage: ContestantStage;
  cycleVotes: number;      // votes in THIS cycle only
  totalVotes: number;      // all-time vote count
}

// ─── Cycle Detail Response ───
interface CycleDetailData {
  cycle: VotingCycle;
  tallies: CycleTally[];
  totalVotesInCycle: number;
}

// ─── Contestant Vote History ───
interface ContestantVoteHistoryEntry {
  cycleId: string;
  cycleName: string;
  cycleStatus: 'pending' | 'active' | 'closed';
  votesInCycle: number;
  startedAt: string;
  closedAt?: string;
}

// ─── Paginated Response ───
interface PaginatedResponse<T> {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: T[];
}
```

---

## Endpoints

### 1. Get Current Active Voting Cycle

```
GET /api/admin/voting/current
```

**Response (active cycle exists):**
```json
{
  "message": "Current voting cycle",
  "data": {
    "cycle": {
      "_id": "66b...",
      "name": "Week 3 Voting",
      "status": "active",
      "startedAt": "2026-08-17T17:00:00.000Z",
      "createdBy": "66a...",
      "createdAt": "2026-08-17T17:00:00.000Z",
      "updatedAt": "2026-08-17T17:00:00.000Z"
    },
    "tallies": [
      {
        "contestantId": "66b...",
        "name": "John Doe",
        "country": "Nigeria",
        "imageUrl": "https://...",
        "status": "active",
        "currentStage": "Stage 2",
        "cycleVotes": 142,
        "totalVotes": 580
      }
    ],
    "totalVotesInCycle": 1450
  }
}
```

**Response (no active cycle):**
```json
{
  "message": "No active voting cycle",
  "data": null
}
```

**Frontend Usage:** Main dashboard card showing current cycle status, total votes, and contestant leaderboard.

---

### 2. List All Voting Cycles

```
GET /api/admin/voting/cycles?page=1&limit=20
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

**Response:**
```json
{
  "message": "Voting cycles",
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "data": [
    {
      "_id": "66b...",
      "name": "Week 3 Voting",
      "status": "active",
      "startedAt": "2026-08-17T17:00:00.000Z",
      "createdBy": "66a...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Frontend Usage:** Voting history table with status badges (Active/Closed/Pending).

---

### 3. Get Specific Cycle Details

```
GET /api/admin/voting/cycles/:id
```

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | MongoDB ObjectId | The voting cycle ID |

**Response:** Same structure as the `data` field in the current cycle response (`CycleDetailData`).

**Error (404):**
```json
{ "statusCode": 404, "message": "Voting cycle not found" }
```

**Frontend Usage:** Drill-down view from the cycles list. Show vote tallies as bar chart or table.

---

### 4. Start a New Voting Cycle

```
POST /api/admin/voting/cycles
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Week 4 Voting"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | ✅ | Max 100 chars, non-empty |

**Response (201 Created):**
```json
{
  "message": "New voting cycle started",
  "data": {
    "_id": "66b...",
    "name": "Week 4 Voting",
    "status": "active",
    "startedAt": "2026-08-17T18:00:00.000Z",
    "createdBy": "66a...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

> **⚠️ WARNING:** Starting a new cycle **automatically closes** any currently active cycle. Add a confirmation modal in the frontend if an active cycle exists:
> *"Starting a new cycle will close the current cycle 'Week 3 Voting'. Continue?"*

**Frontend Usage:** "Start New Cycle" button with a name input and confirmation dialog.

---

### 5. Close a Voting Cycle

```
PATCH /api/admin/voting/cycles/:id/close
```

**Response:**
```json
{
  "message": "Voting cycle closed",
  "data": {
    "_id": "66b...",
    "status": "closed",
    "closedAt": "2026-08-17T19:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 404 | `Voting cycle not found` |
| 400 | `This voting cycle is already closed` |

**Frontend Usage:** "Close Cycle" action button on the active cycle card.

---

### 6. Eliminate a Contestant

```
POST /api/admin/voting/eliminate
Content-Type: application/json
```

**Request Body:**
```json
{
  "contestantId": "66b...",
  "reason": "Lowest votes in Week 3"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `contestantId` | string (ObjectId) | ✅ | Valid MongoDB ID |
| `reason` | string | ❌ | Max 500 chars |

**Response:**
```json
{
  "message": "Contestant eliminated",
  "data": {
    "_id": "66b...",
    "name": "John Doe",
    "status": "eliminated",
    "eliminatedAt": "2026-08-17T19:30:00.000Z",
    "eliminatedInCycle": "66b..."
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| 400 | `No active voting cycle. Cannot eliminate a contestant without an active cycle.` |
| 404 | `Contestant not found` |
| 400 | `Contestant is already eliminated` |

> **🚨 CAUTION:** Elimination is **irreversible** in this implementation. Add a confirmation modal:
> *"Are you sure you want to eliminate John Doe? This action cannot be undone."*

**Frontend Usage:** "Eliminate" button on each contestant row in the admin voting dashboard.

---

### 7. Contestant Vote History

```
GET /api/admin/voting/contestants/:id/history
```

**Response:**
```json
{
  "message": "Contestant vote history",
  "data": [
    {
      "cycleId": "66b...",
      "cycleName": "Week 3 Voting",
      "cycleStatus": "closed",
      "votesInCycle": 142,
      "startedAt": "2026-08-10T00:00:00.000Z",
      "closedAt": "2026-08-17T00:00:00.000Z"
    },
    {
      "cycleId": "66a...",
      "cycleName": "Week 2 Voting",
      "cycleStatus": "closed",
      "votesInCycle": 98,
      "startedAt": "2026-08-03T00:00:00.000Z",
      "closedAt": "2026-08-10T00:00:00.000Z"
    }
  ]
}
```

**Frontend Usage:** Contestant detail view showing a vote trend chart (line graph of votes per cycle).

---

## Error Handling

All error responses follow this format:

```json
{
  "statusCode": 400 | 401 | 403 | 404,
  "message": "Human-readable error message",
  "error": "Bad Request" | "Unauthorized" | "Forbidden" | "Not Found"
}
```

| Status Code | When |
|-------------|------|
| **400** | Validation failure, business rule violation |
| **401** | Missing or invalid admin token |
| **403** | Valid token but insufficient role permissions |
| **404** | Resource not found |

---

## Public Voting — Breaking Change Notice

> **⚠️ IMPORTANT — FRONTEND FIX REQUIRED**
>
> `POST /api/vote/favorite` now requires an active voting cycle.
>
> If no active cycle exists, the endpoint returns:
> ```json
> { "statusCode": 400, "message": "No active voting cycle. Voting is currently closed." }
> ```
>
> **Frontend Fix Required:** In the public voting page (`app/vote/page.tsx`), add a check before rendering the vote button. Call `GET /api/vote/contestants` to determine if contestants are loaded, and handle the 400 error gracefully. Display a "Voting is currently closed" banner when no cycle is active.

---

## Suggested Frontend API Service

```typescript
// services/admin/voting-api.ts
import { httpClient } from '../http';

export const adminVotingApi = {
  getCurrentCycle: () =>
    httpClient.get('/admin/voting/current'),

  listCycles: (page = 1, limit = 20) =>
    httpClient.get(`/admin/voting/cycles?page=${page}&limit=${limit}`),

  getCycleDetail: (cycleId: string) =>
    httpClient.get(`/admin/voting/cycles/${cycleId}`),

  startNewCycle: (name: string) =>
    httpClient.post('/admin/voting/cycles', { name }),

  closeCycle: (cycleId: string) =>
    httpClient.patch(`/admin/voting/cycles/${cycleId}/close`),

  eliminateContestant: (contestantId: string, reason?: string) =>
    httpClient.post('/admin/voting/eliminate', { contestantId, reason }),

  getContestantVoteHistory: (contestantId: string) =>
    httpClient.get(`/admin/voting/contestants/${contestantId}/history`),
};
```

---

## Recommended UI Components

| Component | Data Source | Key Features |
|-----------|------------|--------------|
| **Active Cycle Card** | `GET /current` | Cycle name, start date, total votes, "Close Cycle" button |
| **Contestant Vote Table** | `GET /current` → `tallies[]` | Sortable by cycleVotes/totalVotes, stage badges, "Eliminate" action |
| **Cycle History Table** | `GET /cycles` | Status badges, date range, click to drill into detail |
| **Start Cycle Modal** | `POST /cycles` | Name input, confirmation if active cycle exists |
| **Eliminate Confirmation** | `POST /eliminate` | Contestant name, optional reason textarea, danger styling |
| **Vote History Chart** | `GET /contestants/:id/history` | Line chart of votes per cycle |
