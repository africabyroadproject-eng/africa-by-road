# Admin Contestants Management — Frontend Integration Guide

**Date:** August 18, 2026  
**Backend Module:** Module J — Admin Contestants Management (fully implemented & verified)  
**Base URL:** `{API_HOST}/api`  

---

## Authentication & Authorization

All admin contestant management endpoints require an **admin JWT token** provided in one of the following:
- Cookie: `adminToken`
- Header: `Authorization: Bearer <admin-jwt-token>`

**Required Role:** `contestant_manager`, `admin`, or `superadmin`

> **⚠️ IMPORTANT:** These endpoints are **admin-only**. Requests authenticated with a regular tourist/user token will return `403 Forbidden`.

---

## TypeScript Interfaces & Types

Copy these TypeScript definitions directly into your frontend project (e.g. `types/admin-contestants.ts` or `services/admin/types.ts`):

```typescript
// ─── Competition Stages & Statuses ───
export type ContestantStage = 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Final';
export type ContestantStatus = 'pending' | 'active' | 'eliminated' | 'winner';

// ─── Stage History Audit Record ───
export interface StageHistoryEntry {
  fromStage: string;
  toStage: string;
  movedBy: string;         // Admin ObjectId
  reason?: string;
  movedAt: string;         // ISO 8601 Date
}

// ─── Contestant Entity ───
export interface Contestant {
  _id: string;
  name: string;
  country: string;
  bio: string;
  imageUrl: string;
  votes: number;
  currentStage: ContestantStage;
  status: ContestantStatus;
  createdBy?: string;      // Admin or Tourist ObjectId
  eliminatedAt?: string;   // ISO 8601 Date (if status === 'eliminated')
  eliminatedInCycle?: string;
  stageHistory: StageHistoryEntry[];
  createdAt: string;       // ISO 8601 Date
  updatedAt: string;       // ISO 8601 Date
}

// ─── Aggregate Stage Summary Metrics ───
export interface ContestantStageSummary {
  total: number;
  active: number;
  pending: number;
  eliminated: number;
  winner: number;
  stage1: number;
  stage2: number;
  stage3: number;
  stage4: number;
  final: number;
}

// ─── API Payload Interfaces ───
export interface CreateContestantPayload {
  name: string;
  country: string;
  bio: string;
  imageUrl: string;
  currentStage?: ContestantStage; // Default: 'Stage 1'
  status?: ContestantStatus;      // Default: 'active'
}

export interface UpdateContestantPayload {
  name?: string;
  country?: string;
  bio?: string;
  imageUrl?: string;
}

export interface MoveContestantStagePayload {
  stage: ContestantStage;
  reason?: string;
}

export interface UpdateContestantStatusPayload {
  status: ContestantStatus;
  reason?: string;
}

// ─── API Responses ───
export interface PaginatedContestantsResponse {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stageSummary: ContestantStageSummary;
  data: Contestant[];
}

export interface SingleContestantResponse {
  message: string;
  data: Contestant;
}

export interface StageHistoryResponse {
  message: string;
  data: StageHistoryEntry[];
}
```

---

## API Endpoints Reference

### 1. List Contestants (Paginated + Filters + Summary Stats)

```
GET /api/admin/contestants
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | ❌ (Default: 1) | Current page number |
| `limit` | number | ❌ (Default: 20) | Number of items per page (max: 100) |
| `stage` | string | ❌ | Filter by stage (`Stage 1`, `Stage 2`, `Stage 3`, `Stage 4`, `Final`) |
| `status` | string | ❌ | Filter by status (`pending`, `active`, `eliminated`, `winner`) |
| `country` | string | ❌ | Filter by country (case-insensitive substring match) |
| `search` | string | ❌ | Text search across `name`, `country`, and `bio` |

**Response Example (200 OK):**
```json
{
  "message": "Contestants list",
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "stageSummary": {
    "total": 42,
    "active": 30,
    "pending": 4,
    "eliminated": 7,
    "winner": 1,
    "stage1": 15,
    "stage2": 10,
    "stage3": 5,
    "stage4": 0,
    "final": 0
  },
  "data": [
    {
      "_id": "66b1...",
      "name": "Amara Diallo",
      "country": "Senegal",
      "bio": "Dakar native navigating cross-continental terrain.",
      "imageUrl": "https://cdn.africabyroad.com/contestants/amara.jpg",
      "votes": 1250,
      "currentStage": "Stage 2",
      "status": "active",
      "stageHistory": [
        {
          "fromStage": "N/A",
          "toStage": "Stage 1",
          "movedBy": "66a0...",
          "reason": "Initial contestant registration by admin",
          "movedAt": "2026-08-01T10:00:00.000Z"
        },
        {
          "fromStage": "Stage 1",
          "toStage": "Stage 2",
          "movedBy": "66a0...",
          "reason": "Top vote earner in Week 1",
          "movedAt": "2026-08-10T14:30:00.000Z"
        }
      ],
      "createdAt": "2026-08-01T10:00:00.000Z",
      "updatedAt": "2026-08-10T14:30:00.000Z"
    }
  ]
}
```

---

### 2. Get Contestant Details

```
GET /api/admin/contestants/:id
```

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string (ObjectId) | MongoDB ID of the contestant |

**Response Example (200 OK):**
```json
{
  "message": "Contestant detail",
  "data": {
    "_id": "66b1...",
    "name": "Amara Diallo",
    "country": "Senegal",
    "bio": "Dakar native navigating cross-continental terrain.",
    "imageUrl": "https://cdn.africabyroad.com/contestants/amara.jpg",
    "votes": 1250,
    "currentStage": "Stage 2",
    "status": "active",
    "stageHistory": [...],
    "createdAt": "2026-08-01T10:00:00.000Z",
    "updatedAt": "2026-08-10T14:30:00.000Z"
  }
}
```

---

### 3. Create a New Contestant

```
POST /api/admin/contestants
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Kofi Mensah",
  "country": "Ghana",
  "bio": "Highlander driver from Accra.",
  "imageUrl": "https://cdn.africabyroad.com/contestants/kofi.jpg",
  "currentStage": "Stage 1",
  "status": "active"
}
```

**Response Example (201 Created):**
```json
{
  "message": "Contestant created",
  "data": {
    "_id": "66c2...",
    "name": "Kofi Mensah",
    "country": "Ghana",
    "bio": "Highlander driver from Accra.",
    "imageUrl": "https://cdn.africabyroad.com/contestants/kofi.jpg",
    "votes": 0,
    "currentStage": "Stage 1",
    "status": "active",
    "stageHistory": [
      {
        "fromStage": "N/A",
        "toStage": "Stage 1",
        "movedBy": "66a0...",
        "reason": "Initial contestant registration by admin",
        "movedAt": "2026-08-18T18:00:00.000Z"
      }
    ],
    "createdAt": "2026-08-18T18:00:00.000Z",
    "updatedAt": "2026-08-18T18:00:00.000Z"
  }
}
```

---

### 4. Update Basic Contestant Profile

```
PATCH /api/admin/contestants/:id
Content-Type: application/json
```

**Request Body:**
```json
{
  "bio": "Updated bio text reflecting new route experience.",
  "imageUrl": "https://cdn.africabyroad.com/contestants/kofi-v2.jpg"
}
```

**Response Example (200 OK):**
```json
{
  "message": "Contestant updated",
  "data": {
    "_id": "66c2...",
    "name": "Kofi Mensah",
    "country": "Ghana",
    "bio": "Updated bio text reflecting new route experience.",
    "imageUrl": "https://cdn.africabyroad.com/contestants/kofi-v2.jpg",
    "currentStage": "Stage 1",
    "status": "active"
  }
}
```

---

### 5. Move Contestant Stage (Stage Progression)

```
PATCH /api/admin/contestants/:id/stage
Content-Type: application/json
```

**Request Body:**
```json
{
  "stage": "Stage 2",
  "reason": "Passed public vote threshold in Week 2."
}
```

> **Note:** Target `stage` must be different from current stage. Moving a contestant automatically appends an audit record to `stageHistory`.

**Response Example (200 OK):**
```json
{
  "message": "Contestant stage updated",
  "data": {
    "_id": "66c2...",
    "name": "Kofi Mensah",
    "currentStage": "Stage 2",
    "stageHistory": [
      {
        "fromStage": "Stage 1",
        "toStage": "Stage 2",
        "movedBy": "66a0...",
        "reason": "Passed public vote threshold in Week 2.",
        "movedAt": "2026-08-18T18:30:00.000Z"
      }
    ]
  }
}
```

---

### 6. Update Contestant Status

```
PATCH /api/admin/contestants/:id/status
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "eliminated",
  "reason": "Lowest total votes in Stage 2 elimination round."
}
```

**Response Example (200 OK):**
```json
{
  "message": "Contestant status updated",
  "data": {
    "_id": "66c2...",
    "name": "Kofi Mensah",
    "status": "eliminated",
    "eliminatedAt": "2026-08-18T18:35:00.000Z"
  }
}
```

---

### 7. Get Contestant Stage History Audit Log

```
GET /api/admin/contestants/:id/history
```

**Response Example (200 OK):**
```json
{
  "message": "Contestant stage history",
  "data": [
    {
      "fromStage": "Stage 1",
      "toStage": "Stage 2",
      "movedBy": "66a0...",
      "reason": "Passed public vote threshold in Week 2.",
      "movedAt": "2026-08-18T18:30:00.000Z"
    },
    {
      "fromStage": "N/A",
      "toStage": "Stage 1",
      "movedBy": "66a0...",
      "reason": "Initial contestant registration by admin",
      "movedAt": "2026-08-18T18:00:00.000Z"
    }
  ]
}
```

---

## Ready-to-Use Frontend API Client

Copy this API helper service into `services/admin/contestants-api.ts`:

```typescript
// services/admin/contestants-api.ts
import { httpClient } from '../http'; // Standard Axios client with Bearer token interceptor
import {
  CreateContestantPayload,
  MoveContestantStagePayload,
  PaginatedContestantsResponse,
  SingleContestantResponse,
  StageHistoryResponse,
  UpdateContestantPayload,
  UpdateContestantStatusPayload,
} from './types';

export const adminContestantsApi = {
  /**
   * Fetch paginated list of contestants with optional stage, status, country, or search filters.
   */
  listContestants: (params?: {
    page?: number;
    limit?: number;
    stage?: string;
    status?: string;
    country?: string;
    search?: string;
  }) => httpClient.get<PaginatedContestantsResponse>('/admin/contestants', { params }),

  /**
   * Fetch full contestant details by ID.
   */
  getContestantDetail: (id: string) =>
    httpClient.get<SingleContestantResponse>(`/admin/contestants/${id}`),

  /**
   * Create a new contestant from admin dashboard.
   */
  createContestant: (payload: CreateContestantPayload) =>
    httpClient.post<SingleContestantResponse>('/admin/contestants', payload),

  /**
   * Update basic contestant profile details.
   */
  updateContestant: (id: string, payload: UpdateContestantPayload) =>
    httpClient.patch<SingleContestantResponse>(`/admin/contestants/${id}`, payload),

  /**
   * Move contestant to a new stage (Stage 1 .. Final) with stage history tracking.
   */
  moveStage: (id: string, payload: MoveContestantStagePayload) =>
    httpClient.patch<SingleContestantResponse>(`/admin/contestants/${id}/stage`, payload),

  /**
   * Update contestant status (pending, active, eliminated, winner).
   */
  updateStatus: (id: string, payload: UpdateContestantStatusPayload) =>
    httpClient.patch<SingleContestantResponse>(`/admin/contestants/${id}/status`, payload),

  /**
   * Get complete stage movement audit history.
   */
  getStageHistory: (id: string) =>
    httpClient.get<StageHistoryResponse>(`/admin/contestants/${id}/history`),
};
```

---

## Recommended UI Components & Specs

| Component | Target Location | Description & Behavior |
|-----------|-----------------|------------------------|
| **Stage Summary Metric Cards** | Top of `/admin/contestants` | 5 Metric Cards displaying live counts: Total Contestants, Active, Stage 1..Final breakdown, Eliminated. Rendered directly from `response.stageSummary`. |
| **Filter & Search Bar** | Above table | Search text input (debounced 300ms), Stage Dropdown selector, Status Filter pills, Clear Filters CTA. |
| **Contestant Data Table** | Center dashboard | Columns: Contestant (Avatar + Name), Country, Votes, Stage Badge (`Stage 1`..'Final'), Status Badge (`active`/`eliminated`), Actions (Edit, Move Stage, Change Status, View Audit History). |
| **Move Stage Modal** | Action Trigger | Modal with target stage radio selector, reason textarea, and confirmation button. Calls `PATCH /admin/contestants/:id/stage`. |
| **Contestant Audit Drawer / Modal** | Action Trigger | Timeline view rendering the contestant's `stageHistory` entries (`fromStage` → `toStage`, reason, admin ID, formatted timestamp). |
