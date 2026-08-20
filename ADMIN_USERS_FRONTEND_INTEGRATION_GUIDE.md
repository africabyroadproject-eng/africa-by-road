# Admin User Management — Frontend Integration Guide

**Date:** August 18, 2026  
**Backend Module:** Module I — Admin User Management (fully implemented & verified)  
**Base URL:** `{API_HOST}/api`  

---

## Authentication & Authorization

All admin user management endpoints require an **admin JWT token** provided in one of:
- Cookie: `adminToken`
- Header: `Authorization: Bearer <admin-jwt-token>`

**Required Role:** `user_manager`, `admin`, or `superadmin`

> **⚠️ IMPORTANT:** These endpoints are **admin-only**. Requests authenticated with a regular tourist/user token will return `403 Forbidden`.

---

## TypeScript Interfaces & Types

Copy these TypeScript definitions into your frontend project (e.g. `types/admin-users.ts` or `services/admin/types.ts`):

```typescript
// ─── Registration & Account Status Types ───
export type RegistrationStatus = 'pending' | 'in_progress' | 'complete';
export type AuthProvider = 'password' | 'google';

// ─── Document Upload Definition ───
export interface IDocumentUpload {
  name: string;
  url?: string;
  storageKey?: string;
  resourceType?: string;
  format?: string;
  bytes?: number;
  uploadedAt?: string;
}

// ─── Social Media Profile ───
export interface ISocialMedia {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
}

// ─── User Entity (Admin View) ───
export interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  nationality?: string;
  state?: string;
  city?: string;
  residentialAddress?: string;
  dateOfBirth?: string;
  role: 'tourist';
  isEmailVerified: boolean;
  authProvider?: AuthProvider;
  isPaid?: boolean;
  paymentReference?: string;
  paymentDate?: string;
  isCommunityMember?: boolean;
  isOnboarded?: boolean;
  contestantProfile?: any;
  socialMedia?: ISocialMedia;
  governmentId?: IDocumentUpload;
  proofOfAddress?: IDocumentUpload;
  medicalRecords?: IDocumentUpload;
  registrationStatus: RegistrationStatus;
  isBlocked?: boolean;
  blockedAt?: string;
  blockedReason?: string;
  createdAt: string;       // ISO 8601 Date
  updatedAt: string;       // ISO 8601 Date
}

// ─── User Aggregate Summary Metrics ───
export interface UserSummaryStats {
  total: number;
  active: number;
  paid: number;
  verified: number;
  blocked: number;
  pendingRegistration: number;
  inProgressRegistration: number;
  completeRegistration: number;
}

// ─── API Payload Interfaces ───
export interface BlockUserPayload {
  isBlocked: boolean;
  reason?: string;
}

// ─── API Responses ───
export interface PaginatedUsersResponse {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  userSummary: UserSummaryStats;
  data: AdminUser[];
}

export interface SingleUserResponse {
  message: string;
  data: AdminUser;
}

export interface UserStatsResponse {
  message: string;
  data: UserSummaryStats;
}
```

---

## API Endpoints Reference

### 1. List Users (Paginated + Filters + Summary Metrics)

```
GET /api/admin/users
```

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | ❌ (Default: 1) | Page number |
| `limit` | number | ❌ (Default: 20) | Items per page (max: 100) |
| `isPaid` | boolean | ❌ | Filter by payment status (`true`/`false`) |
| `isEmailVerified` | boolean | ❌ | Filter by email verification status |
| `isBlocked` | boolean | ❌ | Filter by blocked state (`true`/`false`) |
| `registrationStatus` | string | ❌ | Filter by application status (`pending`, `in_progress`, `complete`) |
| `search` | string | ❌ | Text search across `email`, `firstName`, `lastName`, and `phoneNumber` |

**Response Example (200 OK):**
```json
{
  "message": "Users list",
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "userSummary": {
    "total": 150,
    "active": 145,
    "paid": 98,
    "verified": 130,
    "blocked": 5,
    "pendingRegistration": 20,
    "inProgressRegistration": 40,
    "completeRegistration": 90
  },
  "data": [
    {
      "_id": "66a1...",
      "email": "jane.doe@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "phoneNumber": "+2348012345678",
      "nationality": "Nigeria",
      "isEmailVerified": true,
      "isPaid": true,
      "registrationStatus": "complete",
      "isBlocked": false,
      "createdAt": "2026-08-05T12:00:00.000Z",
      "updatedAt": "2026-08-10T14:20:00.000Z"
    }
  ]
}
```

---

### 2. Get User Metrics Statistics Overview

```
GET /api/admin/users/stats
```

**Response Example (200 OK):**
```json
{
  "message": "User statistics",
  "data": {
    "total": 150,
    "active": 145,
    "paid": 98,
    "verified": 130,
    "blocked": 5,
    "pendingRegistration": 20,
    "inProgressRegistration": 40,
    "completeRegistration": 90
  }
}
```

---

### 3. Get Full User Profile Details

```
GET /api/admin/users/:id
```

**Response Example (200 OK):**
```json
{
  "message": "User detail",
  "data": {
    "_id": "66a1...",
    "email": "jane.doe@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phoneNumber": "+2348012345678",
    "nationality": "Nigeria",
    "state": "Lagos",
    "city": "Ikeja",
    "isEmailVerified": true,
    "isPaid": true,
    "paymentReference": "MECASH_TX_98765",
    "paymentDate": "2026-08-06T10:15:00.000Z",
    "registrationStatus": "complete",
    "isBlocked": false,
    "governmentId": {
      "name": "passport.pdf",
      "url": "https://cdn.africabyroad.com/docs/passport.pdf"
    },
    "socialMedia": {
      "instagram": "@janedoe_travels"
    },
    "createdAt": "2026-08-05T12:00:00.000Z"
  }
}
```

---

### 4. Block or Unblock User Account

```
PATCH /api/admin/users/:id/block
Content-Type: application/json
```

**Request Body (Block User):**
```json
{
  "isBlocked": true,
  "reason": "Suspicious login activity and multi-account voting."
}
```

**Request Body (Unblock User):**
```json
{
  "isBlocked": false,
  "reason": "Identity verified via support ticket."
}
```

**Response Example (200 OK):**
```json
{
  "message": "User blocked successfully",
  "data": {
    "_id": "66a1...",
    "email": "jane.doe@example.com",
    "isBlocked": true,
    "blockedAt": "2026-08-18T18:45:00.000Z",
    "blockedReason": "Suspicious login activity and multi-account voting."
  }
}
```

---

## Ready-to-Use Frontend API Client

Copy this API helper into `services/admin/users-api.ts`:

```typescript
// services/admin/users-api.ts
import { httpClient } from '../http';
import {
  BlockUserPayload,
  PaginatedUsersResponse,
  SingleUserResponse,
  UserStatsResponse,
} from './types';

export const adminUsersApi = {
  /**
   * Fetch paginated list of registered tourist users with filters & search.
   */
  listUsers: (params?: {
    page?: number;
    limit?: number;
    isPaid?: boolean;
    isEmailVerified?: boolean;
    isBlocked?: boolean;
    registrationStatus?: string;
    search?: string;
  }) => httpClient.get<PaginatedUsersResponse>('/admin/users', { params }),

  /**
   * Fetch overview metrics summary stats for dashboard cards.
   */
  getUserStats: () =>
    httpClient.get<UserStatsResponse>('/admin/users/stats'),

  /**
   * Fetch full user profile details including document URLs and payment reference.
   */
  getUserDetail: (id: string) =>
    httpClient.get<SingleUserResponse>(`/admin/users/${id}`),

  /**
   * Block or unblock a user account with optional reason.
   */
  toggleBlock: (id: string, payload: BlockUserPayload) =>
    httpClient.patch<SingleUserResponse>(`/admin/users/${id}/block`, payload),
};
```

---

## Recommended UI Components

| Component | Description & Placement |
|-----------|-------------------------|
| **User Metrics Cards Bar** | Top of `/admin/users`: 4 Cards showing **Total Registered**, **Paid Users**, **Verified Users**, and **Blocked Users** directly from `userSummary`. |
| **Search & Status Filter Bar** | Search input (email/name/phone), Paid Filter dropdown (`All`, `Paid`, `Unpaid`), Block Filter dropdown (`All`, `Active`, `Blocked`), Application Status Filter (`All`, `Pending`, `In Progress`, `Complete`). |
| **User Data Table** | Main table displaying User (Name + Email), Phone, Country, Registration Status Badge, Payment Badge (`Paid`/`Unpaid`), Block Status Badge (`Active`/`Blocked`), Actions (`View Profile`, `Block/Unblock`). |
| **Block / Unblock Confirmation Modal** | Modal with toggle status indicator, reason textarea, and styled Action button (Red for Block, Green for Unblock). |
| **User Profile Drawer** | Slide-out side drawer displaying complete user profile, uploaded government ID / proof of address document links, payment reference, and social media handles. |
