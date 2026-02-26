# API Endpoints Reference

## Overview

### Base URL
```
https://api.yourapp.com/v1
```

### Common Headers

Every protected endpoint requires these headers:

```
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
x-company-id: <companyId>          (required for company-side routes)
x-contributor-id: <contributorId>  (required for contributor-side routes)
```

### Standard Error Response (all endpoints)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You do not have permission to perform this action."
  }
}
```

### Standard Success Envelope
```json
{
  "success": true,
  "data": { ... }
}
```

---

## Route Groups

| Prefix | Who Uses It |
|---|---|
| `/webhooks/...` | Clerk & Stripe server-to-server |
| `/auth/...` | Any authenticated user |
| `/company/...` | Company admins/managers/viewers |
| `/contributor/...` | Onboarded contributors |
| `/internal/...` | Your own scheduler/worker service |

---

## 1. Webhooks

### `POST /webhooks/clerk`
Receives Clerk events: `user.created`, `organizationMembership.created`, `invitation.accepted`, etc.

**Headers (server-to-server, no auth token):**
```
svix-id: <svix_id>
svix-timestamp: <timestamp>
svix-signature: <signature>
```

**Request Body (example — invitation accepted):**
```json
{
  "type": "organizationInvitation.accepted",
  "data": {
    "id": "inv_2xyz",
    "email_address": "john@gmail.com",
    "organization_id": "org_2abc123",
    "public_metadata": {
      "contributorId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "monitoredContributorId": "64f1a2b3c4d5e6f7a8b9c0d2"
    }
  }
}
```

**Response `200`:**
```json
{ "received": true }
```

---

### `POST /webhooks/stripe`
Receives Stripe events: `customer.subscription.updated`, `invoice.payment_failed`, etc.

**Headers:**
```
stripe-signature: <stripe_sig>
```

**Request Body (Stripe standard event envelope):**
```json
{
  "id": "evt_xxx",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_xxx",
      "status": "active",
      "customer": "cus_xxx",
      "items": {
        "data": [{ "price": { "id": "price_xxx" } }]
      },
      "current_period_start": 1700000000,
      "current_period_end": 1702678400
    }
  }
}
```

**Response `200`:**
```json
{ "received": true }
```

---

## 2. Auth

### `POST /auth/company/onboard`
Called after the first Clerk org is created. Creates the `companies` and first `company_members` (admin) document.

**Headers:** `Authorization: Bearer <clerk_session_token>`

**Request:**
```json
{
  "clerkOrgId": "org_2abc123",
  "companyName": "Acme Corp",
  "adminEmail": "admin@acme.com",
  "timezone": "America/New_York"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "companyId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Acme Corp",
    "subscription": {
      "planName": "free_trial",
      "status": "trialing"
    }
  }
}
```

---

### `GET /auth/me`
Returns the current user's identity — whether company member or contributor — based on their Clerk token.

**Headers:** `Authorization: Bearer <clerk_session_token>`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "clerkUserId": "user_2xyz",
    "type": "company_member",
    "role": "admin",
    "companyId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "companyName": "Acme Corp"
  }
}
```

For a contributor:
```json
{
  "success": true,
  "data": {
    "clerkUserId": "user_2abc",
    "type": "contributor",
    "contributorId": "64f1a2b3c4d5e6f7a8b9c0d3",
    "githubUsername": "johndoe",
    "hasCompletedOnboarding": true
  }
}
```

---

## 3. Company — Members

### `GET /company/members`
List all members of the company.

**Headers:** `Authorization`, `x-company-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "_id": "64f...",
        "name": "Alice",
        "email": "alice@acme.com",
        "role": "admin",
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

---

### `POST /company/members/invite`
Invite a team member to the company dashboard via Clerk.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Request:**
```json
{
  "email": "bob@acme.com",
  "role": "manager"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "message": "Invitation sent to bob@acme.com"
  }
}
```

---

### `PATCH /company/members/:memberId`
Update a member's role.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Request:**
```json
{
  "role": "viewer"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "role": "viewer",
    "updatedAt": "2024-06-01T00:00:00Z"
  }
}
```

---

### `DELETE /company/members/:memberId`
Remove a company member.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Response `200`:**
```json
{
  "success": true,
  "data": { "message": "Member removed." }
}
```

---

## 4. Company — Repositories

### `POST /company/repos`
Onboard a new GitHub repository by providing a fine-grained PAT. Backend validates the token against GitHub API before saving.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Request:**
```json
{
  "accessToken": "ghp_xxxxxxxxxxxxxxxxxxxx",
  "owner": "acme-corp",
  "repoName": "backend-api"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "fullName": "acme-corp/backend-api",
    "isPrivate": true,
    "status": "active",
    "createdAt": "2024-06-01T00:00:00Z"
  }
}
```

**Error `400` (token invalid):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAT",
    "message": "The provided access token could not authenticate against acme-corp/backend-api."
  }
}
```

---

### `GET /company/repos`
List all onboarded repos for the company.

**Headers:** `Authorization`, `x-company-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "repos": [
      {
        "_id": "64f...",
        "fullName": "acme-corp/backend-api",
        "owner": "acme-corp",
        "name": "backend-api",
        "isPrivate": true,
        "status": "active",
        "lastSyncedAt": "2024-06-01T10:00:00Z"
      }
    ]
  }
}
```

---

### `GET /company/repos/:repoId/contributors`
Fetch the list of GitHub contributors for a repo (calls GitHub API using the stored PAT). Used to populate the "select contributors to monitor" UI.

**Headers:** `Authorization`, `x-company-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "contributors": [
      {
        "githubUsername": "johndoe",
        "githubUserId": 987654321,
        "avatarUrl": "https://avatars.githubusercontent.com/u/987654321",
        "contributions": 142,
        "isAlreadyMonitored": false
      },
      {
        "githubUsername": "janedoe",
        "githubUserId": 123456789,
        "avatarUrl": "https://avatars.githubusercontent.com/u/123456789",
        "contributions": 98,
        "isAlreadyMonitored": true
      }
    ]
  }
}
```

---

### `DELETE /company/repos/:repoId`
Remove a repo from monitoring. Also pauses all active `monitored_contributors` for that repo.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Repository removed. 3 monitoring configs have been paused."
  }
}
```

---

### `PATCH /company/repos/:repoId/token`
Rotate or update the PAT for a repo.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Request:**
```json
{
  "accessToken": "ghp_newtoken123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "status": "active",
    "message": "Token updated and validated successfully."
  }
}
```

---

## 5. Company — Monitored Contributors

### `POST /company/monitored-contributors`
Add a contributor to a repo for monitoring. This is the main configuration step — sets schedule, fetch config, monitoring type, recipients, and optionally sends a Clerk invite.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin` or `manager`

**Request:**
```json
{
  "githubUsername": "johndoe",
  "repositoryId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "monitoringType": "open",
  "inviteEmail": "john@gmail.com",

  "schedule": {
    "type": "specific_weekdays",
    "config": {
      "weekdays": [1, 3, 5]
    },
    "time": "09:00",
    "timezone": "America/New_York"
  },

  "fetchConfig": {
    "windowType": "since_last_run"
  },

  "emailConfig": {
    "recipients": [
      { "email": "admin@acme.com", "type": "company_admin" },
      { "email": "lead@acme.com", "type": "custom" }
    ]
  }
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "githubUsername": "johndoe",
    "repoFullName": "acme-corp/backend-api",
    "monitoringType": "open",
    "inviteStatus": "sent",
    "schedule": {
      "type": "specific_weekdays",
      "nextRunAt": "2024-06-03T09:00:00Z"
    },
    "createdAt": "2024-06-01T00:00:00Z"
  }
}
```

---

### `GET /company/monitored-contributors`
List all monitored contributors for the company with optional filters.

**Headers:** `Authorization`, `x-company-id`

**Query Params:**
- `repoId` (optional)
- `status` — `active` | `paused` | `removed`
- `monitoringType` — `ghost` | `open`
- `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "items": [
      {
        "_id": "64f...",
        "githubUsername": "johndoe",
        "avatarUrl": "https://...",
        "repoFullName": "acme-corp/backend-api",
        "monitoringType": "open",
        "inviteStatus": "accepted",
        "status": "active",
        "schedule": {
          "type": "specific_weekdays",
          "nextRunAt": "2024-06-03T09:00:00Z",
          "lastRunAt": "2024-06-01T09:00:00Z"
        }
      }
    ]
  }
}
```

---

### `GET /company/monitored-contributors/:id`
Get full config detail for one monitored contributor slot.

**Headers:** `Authorization`, `x-company-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "githubUsername": "johndoe",
    "avatarUrl": "https://...",
    "repositoryId": "64f...",
    "repoFullName": "acme-corp/backend-api",
    "monitoringType": "open",
    "status": "active",
    "inviteStatus": "accepted",
    "inviteEmail": "john@gmail.com",
    "schedule": {
      "type": "specific_weekdays",
      "config": { "weekdays": [1, 3, 5] },
      "time": "09:00",
      "timezone": "America/New_York",
      "isActive": true,
      "nextRunAt": "2024-06-03T09:00:00Z",
      "lastRunAt": "2024-06-01T09:00:00Z"
    },
    "fetchConfig": {
      "windowType": "since_last_run",
      "dateRange": { "from": null, "to": null }
    },
    "emailConfig": {
      "recipients": [
        { "email": "admin@acme.com", "type": "company_admin" },
        { "email": "lead@acme.com", "type": "custom" },
        { "email": "john@gmail.com", "type": "contributor" }
      ]
    }
  }
}
```

---

### `PATCH /company/monitored-contributors/:id`
Update schedule, fetch config, recipients, monitoring type, or status.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin` or `manager`

**Request (partial update — only send what you're changing):**
```json
{
  "schedule": {
    "type": "daily",
    "config": {},
    "time": "08:00",
    "timezone": "America/New_York"
  },
  "fetchConfig": {
    "windowType": "date_range",
    "dateRange": {
      "from": "2024-06-01T00:00:00Z",
      "to": "2024-06-30T23:59:59Z"
    }
  },
  "emailConfig": {
    "recipients": [
      { "email": "admin@acme.com", "type": "company_admin" },
      { "email": "newlead@acme.com", "type": "custom" }
    ]
  },
  "status": "paused"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "schedule": {
      "type": "daily",
      "nextRunAt": "2024-06-02T08:00:00Z"
    },
    "status": "paused",
    "updatedAt": "2024-06-01T12:00:00Z"
  }
}
```

---

### `DELETE /company/monitored-contributors/:id`
Permanently remove a monitoring config.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Response `200`:**
```json
{
  "success": true,
  "data": { "message": "Monitoring config removed." }
}
```

---

### `POST /company/monitored-contributors/:id/trigger`
Manually trigger a summary run outside the schedule.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin` or `manager`

**Request:**
```json
{
  "fetchConfig": {
    "windowType": "date_range",
    "dateRange": {
      "from": "2024-05-01T00:00:00Z",
      "to": "2024-05-31T23:59:59Z"
    }
  }
}
```

**Response `202`:**
```json
{
  "success": true,
  "data": {
    "runId": "64f...",
    "message": "Summary run queued.",
    "estimatedCompletionSeconds": 15
  }
}
```

---

### `POST /company/monitored-contributors/:id/resend-invite`
Resend or re-issue a Clerk invite for open monitoring.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Request:**
```json
{
  "email": "john@gmail.com"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Invite resent to john@gmail.com",
    "inviteStatus": "sent"
  }
}
```

---

## 6. Company — Teams

### `POST /company/teams`
Create a new team.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin` or `manager`

**Request:**
```json
{
  "name": "Backend Team",
  "description": "Handles API and infrastructure PRs",
  "memberContributorIds": ["64f...", "64f...", "64f..."]
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "name": "Backend Team",
    "memberCount": 3,
    "createdAt": "2024-06-01T00:00:00Z"
  }
}
```

---

### `GET /company/teams`
List all teams.

**Headers:** `Authorization`, `x-company-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "teams": [
      {
        "_id": "64f...",
        "name": "Backend Team",
        "description": "Handles API and infrastructure PRs",
        "memberCount": 3,
        "createdAt": "2024-06-01T00:00:00Z"
      }
    ]
  }
}
```

---

### `GET /company/teams/:teamId`
Get team details including full member list.

**Headers:** `Authorization`, `x-company-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "name": "Backend Team",
    "description": "Handles API and infrastructure PRs",
    "members": [
      {
        "contributorId": "64f...",
        "githubUsername": "johndoe",
        "avatarUrl": "https://..."
      }
    ],
    "createdAt": "2024-06-01T00:00:00Z"
  }
}
```

---

### `PATCH /company/teams/:teamId`
Update team name, description, or member list.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin` or `manager`

**Request:**
```json
{
  "name": "Backend & Infra Team",
  "memberContributorIds": ["64f...", "64f...", "64f...", "64f..."]
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "name": "Backend & Infra Team",
    "memberCount": 4,
    "updatedAt": "2024-06-01T12:00:00Z"
  }
}
```

---

### `DELETE /company/teams/:teamId`
Delete a team (does NOT remove contributors from monitoring).

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Response `200`:**
```json
{
  "success": true,
  "data": { "message": "Team deleted." }
}
```

---

## 7. Company — Summary Runs & Analytics

### `GET /company/summary-runs`
List historical summary runs across the company with filters.

**Headers:** `Authorization`, `x-company-id`

**Query Params:**
- `monitoredContributorId` (optional)
- `contributorId` (optional)
- `repositoryId` (optional)
- `teamId` (optional)
- `from` — ISO date
- `to` — ISO date
- `emailStatus` — `sent` | `failed` | `skipped`
- `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "total": 87,
    "page": 1,
    "limit": 20,
    "items": [
      {
        "_id": "64f...",
        "githubUsername": "johndoe",
        "repoFullName": "acme-corp/backend-api",
        "scheduledAt": "2024-06-03T09:00:00Z",
        "completedAt": "2024-06-03T09:00:14Z",
        "hasActivity": true,
        "prStats": { "totalPRsFetched": 4 },
        "emailStatus": { "status": "sent", "sentAt": "2024-06-03T09:00:15Z" },
        "triggerType": "scheduled"
      }
    ]
  }
}
```

---

### `GET /company/summary-runs/:runId`
Get full detail of a single summary run including the AI summary text.

**Headers:** `Authorization`, `x-company-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "githubUsername": "johndoe",
    "repoFullName": "acme-corp/backend-api",
    "scheduledAt": "2024-06-03T09:00:00Z",
    "completedAt": "2024-06-03T09:00:14Z",
    "fetchWindow": {
      "from": "2024-05-29T09:00:00Z",
      "to": "2024-06-03T09:00:00Z"
    },
    "prStats": {
      "totalPRsFetched": 4,
      "prNumbers": [201, 204, 207, 210]
    },
    "hasActivity": true,
    "aiSummary": "This week John merged 4 PRs focusing on...",
    "contributorNoteSnapshot": "Also reviewed 2 PRs from teammates.",
    "emailStatus": {
      "status": "sent",
      "sentAt": "2024-06-03T09:00:15Z",
      "recipients": ["admin@acme.com", "lead@acme.com"]
    },
    "triggerType": "scheduled"
  }
}
```

---

### `GET /company/analytics/overview`
Company-wide PR activity analytics for the dashboard.

**Headers:** `Authorization`, `x-company-id`

**Query Params:**
- `from` — ISO date
- `to` — ISO date
- `teamId` (optional)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2024-05-01", "to": "2024-05-31" },
    "totalRuns": 124,
    "totalEmailsSent": 119,
    "totalPRsSummarised": 487,
    "activeContributors": 12,
    "inactiveContributors": 2,
    "topContributors": [
      { "githubUsername": "johndoe", "avatarUrl": "https://...", "totalPRs": 42 },
      { "githubUsername": "janedoe", "avatarUrl": "https://...", "totalPRs": 38 }
    ],
    "activityTimeline": [
      { "date": "2024-05-01", "totalPRs": 12, "totalRuns": 4 },
      { "date": "2024-05-06", "totalPRs": 18, "totalRuns": 6 }
    ]
  }
}
```

---

### `GET /company/analytics/contributor/:contributorId`
Per-contributor analytics for the company (across all repos they are monitored in).

**Headers:** `Authorization`, `x-company-id`

**Query Params:** `from`, `to`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "contributorId": "64f...",
    "githubUsername": "johndoe",
    "period": { "from": "2024-05-01", "to": "2024-05-31" },
    "totalRuns": 10,
    "totalEmailsSent": 10,
    "totalPRs": 42,
    "avgPRsPerRun": 4.2,
    "activityTimeline": [
      { "date": "2024-05-06", "runId": "64f...", "totalPRs": 4, "hasActivity": true }
    ],
    "repoBreakdown": [
      { "repoFullName": "acme-corp/backend-api", "totalPRs": 28 },
      { "repoFullName": "acme-corp/frontend", "totalPRs": 14 }
    ]
  }
}
```

---

### `GET /company/analytics/team/:teamId`
Team-level analytics.

**Headers:** `Authorization`, `x-company-id`

**Query Params:** `from`, `to`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "teamId": "64f...",
    "teamName": "Backend Team",
    "period": { "from": "2024-05-01", "to": "2024-05-31" },
    "totalPRs": 134,
    "members": [
      { "githubUsername": "johndoe", "totalPRs": 42 },
      { "githubUsername": "janedoe", "totalPRs": 38 }
    ],
    "activityTimeline": [
      { "date": "2024-05-06", "totalPRs": 18 }
    ]
  }
}
```

---

## 8. Company — Subscription & Billing

### `GET /company/subscription`
Get current plan and usage.

**Headers:** `Authorization`, `x-company-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "planName": "pro",
    "displayName": "Pro Plan",
    "status": "active",
    "currentPeriodEnd": "2024-07-01T00:00:00Z",
    "limits": {
      "maxRepos": 10,
      "maxContributors": 50,
      "maxEmailsPerMonth": 1000
    },
    "usage": {
      "reposCount": 3,
      "contributorsCount": 12,
      "emailsSentThisMonth": 145
    }
  }
}
```

---

### `GET /company/plans`
List all available plans (for upgrade/downgrade UI).

**Headers:** `Authorization`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "_id": "64f...",
        "name": "starter",
        "displayName": "Starter",
        "priceMonthly": 19,
        "priceYearly": 182,
        "limits": {
          "maxRepos": 3,
          "maxContributors": 10,
          "maxEmailsPerMonth": 200
        }
      },
      {
        "_id": "64f...",
        "name": "pro",
        "displayName": "Pro",
        "priceMonthly": 49,
        "priceYearly": 470,
        "limits": {
          "maxRepos": 10,
          "maxContributors": 50,
          "maxEmailsPerMonth": 1000
        }
      }
    ]
  }
}
```

---

### `POST /company/subscription/checkout`
Create a Stripe Checkout session for new subscription or plan change.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Request:**
```json
{
  "planId": "64f...",
  "billingInterval": "monthly",
  "successUrl": "https://app.yourapp.com/settings/billing?success=true",
  "cancelUrl": "https://app.yourapp.com/settings/billing"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_xxx"
  }
}
```

---

### `POST /company/subscription/portal`
Create a Stripe Customer Portal session for managing payment methods or cancelling.

**Headers:** `Authorization`, `x-company-id` | **Role required:** `admin`

**Request:**
```json
{
  "returnUrl": "https://app.yourapp.com/settings/billing"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "portalUrl": "https://billing.stripe.com/session/xxx"
  }
}
```

---

## 9. Contributor — Account & Onboarding

### `POST /contributor/onboard`
Called after a contributor accepts a Clerk invite and lands on the onboarding screen. Creates the `contributor_accounts` document.

**Headers:** `Authorization: Bearer <clerk_session_token>`, `x-contributor-id`

**Request:**
```json
{
  "name": "John Doe",
  "personalEmail": "john@gmail.com"
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "contributorAccountId": "64f...",
    "name": "John Doe",
    "hasMailConfig": false
  }
}
```

---

### `PATCH /contributor/mail-config`
Connect a Gmail or Zoho account by saving the app password.

**Headers:** `Authorization`, `x-contributor-id`

**Request:**
```json
{
  "provider": "gmail",
  "email": "john@gmail.com",
  "appPassword": "xxxx xxxx xxxx xxxx"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "provider": "gmail",
    "email": "john@gmail.com",
    "configuredAt": "2024-06-01T00:00:00Z"
  }
}
```

---

### `GET /contributor/profile`
Get the contributor's own profile and mail config status.

**Headers:** `Authorization`, `x-contributor-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "githubUsername": "johndoe",
    "name": "John Doe",
    "personalEmail": "john@gmail.com",
    "mailConfig": {
      "provider": "gmail",
      "email": "john@gmail.com",
      "isConfigured": true
    },
    "createdAt": "2024-06-01T00:00:00Z"
  }
}
```

---

## 10. Contributor — Note & Templates

### `PATCH /contributor/note/:monitoredContributorId`
Update the contributor's current note for a specific monitoring slot (appended to next email). Max 5000 characters.

**Headers:** `Authorization`, `x-contributor-id`

**Request:**
```json
{
  "note": "This week I focused on refactoring the auth module and reviewing 2 PRs from teammates. Planning to tackle the rate limiting feature next sprint."
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "monitoredContributorId": "64f...",
    "note": "This week I focused on...",
    "characterCount": 183,
    "updatedAt": "2024-06-01T12:00:00Z"
  }
}
```

**Error `400` (exceeds limit):**
```json
{
  "success": false,
  "error": {
    "code": "NOTE_TOO_LONG",
    "message": "Note exceeds the 5000 character limit. Current length: 5142."
  }
}
```

---

### `GET /contributor/templates`
Get all saved note templates for the contributor.

**Headers:** `Authorization`, `x-contributor-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "_id": "64f...",
        "title": "My Weekly Update",
        "content": "This week I focused on...",
        "createdAt": "2024-06-01T00:00:00Z",
        "updatedAt": "2024-06-01T00:00:00Z"
      }
    ]
  }
}
```

---

### `POST /contributor/templates`
Save a new note template.

**Headers:** `Authorization`, `x-contributor-id`

**Request:**
```json
{
  "title": "Sprint End Summary",
  "content": "This sprint I completed..."
}
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "title": "Sprint End Summary",
    "createdAt": "2024-06-01T00:00:00Z"
  }
}
```

---

### `PATCH /contributor/templates/:templateId`
Update an existing template.

**Headers:** `Authorization`, `x-contributor-id`

**Request:**
```json
{
  "title": "Sprint End Summary v2",
  "content": "Updated template content..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "title": "Sprint End Summary v2",
    "updatedAt": "2024-06-01T12:00:00Z"
  }
}
```

---

### `DELETE /contributor/templates/:templateId`
Delete a saved template.

**Headers:** `Authorization`, `x-contributor-id`

**Response `200`:**
```json
{
  "success": true,
  "data": { "message": "Template deleted." }
}
```

---

## 11. Contributor — Dashboard & Analytics

### `GET /contributor/monitoring-slots`
List all monitoring slots the contributor is part of (across all companies that monitor them).

**Headers:** `Authorization`, `x-contributor-id`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "monitoredContributorId": "64f...",
        "repoFullName": "acme-corp/backend-api",
        "monitoringType": "open",
        "schedule": {
          "type": "specific_weekdays",
          "nextRunAt": "2024-06-03T09:00:00Z"
        },
        "currentNote": "This week I focused on...",
        "status": "active"
      }
    ]
  }
}
```

---

### `GET /contributor/summary-runs`
Contributor's own run history (only shows their own data, never another contributor's).

**Headers:** `Authorization`, `x-contributor-id`

**Query Params:** `from`, `to`, `repoFullName`, `page`, `limit`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "total": 24,
    "page": 1,
    "limit": 20,
    "items": [
      {
        "_id": "64f...",
        "repoFullName": "acme-corp/backend-api",
        "scheduledAt": "2024-06-03T09:00:00Z",
        "hasActivity": true,
        "prStats": { "totalPRsFetched": 4 },
        "aiSummary": "This week John merged 4 PRs...",
        "emailStatus": { "status": "sent", "sentAt": "2024-06-03T09:00:15Z" }
      }
    ]
  }
}
```

---

### `GET /contributor/analytics`
Contributor's own analytics for their dashboard.

**Headers:** `Authorization`, `x-contributor-id`

**Query Params:** `from`, `to`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "period": { "from": "2024-05-01", "to": "2024-05-31" },
    "totalRuns": 10,
    "totalPRs": 42,
    "avgPRsPerRun": 4.2,
    "activityTimeline": [
      { "date": "2024-05-06", "runId": "64f...", "totalPRs": 4, "hasActivity": true },
      { "date": "2024-05-13", "runId": "64f...", "totalPRs": 0, "hasActivity": false }
    ],
    "repoBreakdown": [
      { "repoFullName": "acme-corp/backend-api", "totalPRs": 28 },
      { "repoFullName": "acme-corp/frontend", "totalPRs": 14 }
    ]
  }
}
```

---

## 12. Internal — Scheduler / Worker

These endpoints are called by your internal cron/queue worker, not by users. Protect them with a shared secret header, not Clerk tokens.

**Internal Auth Header:**
```
x-internal-secret: <your_internal_worker_secret>
```

---

### `GET /internal/scheduler/due-runs`
Fetches all `monitored_contributors` where `schedule.nextRunAt <= now` and `status == active`.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "dueRuns": [
      {
        "monitoredContributorId": "64f...",
        "githubUsername": "johndoe",
        "repoFullName": "acme-corp/backend-api",
        "encryptedAccessToken": "enc:ghp_xxx",
        "fetchConfig": {
          "windowType": "since_last_run",
          "lastRunAt": "2024-05-27T09:00:00Z"
        },
        "recipients": ["admin@acme.com", "lead@acme.com"]
      }
    ]
  }
}
```

---

### `POST /internal/runs/execute`
Called by the worker to kick off one full run: fetch PRs → LLM summary → send email → log result.

**Request:**
```json
{
  "monitoredContributorId": "64f...",
  "triggerType": "scheduled"
}
```

**Response `202`:**
```json
{
  "success": true,
  "data": {
    "runId": "64f...",
    "status": "queued"
  }
}
```

---

### `PATCH /internal/runs/:runId/complete`
Called by the worker after a run finishes to save the result and calculate `nextRunAt`.

**Request:**
```json
{
  "completedAt": "2024-06-03T09:00:14Z",
  "fetchWindow": {
    "from": "2024-05-27T09:00:00Z",
    "to": "2024-06-03T09:00:00Z"
  },
  "prStats": {
    "totalPRsFetched": 4,
    "prNumbers": [201, 204, 207, 210]
  },
  "hasActivity": true,
  "aiSummary": "This week John merged 4 PRs focusing on...",
  "contributorNoteSnapshot": "Also reviewed 2 PRs from teammates.",
  "emailStatus": {
    "status": "sent",
    "sentAt": "2024-06-03T09:00:15Z",
    "recipients": ["admin@acme.com", "lead@acme.com"],
    "failureReason": null
  }
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "runId": "64f...",
    "nextRunAt": "2024-06-05T09:00:00Z"
  }
}
```

---

## Endpoint Summary Table

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/webhooks/clerk` | Svix signature | Clerk events |
| POST | `/webhooks/stripe` | Stripe signature | Stripe events |
| POST | `/auth/company/onboard` | Clerk | Create company after org creation |
| GET | `/auth/me` | Clerk | Get current user identity |
| GET | `/company/members` | Clerk + company | List company members |
| POST | `/company/members/invite` | Clerk + admin | Invite a member |
| PATCH | `/company/members/:id` | Clerk + admin | Update member role |
| DELETE | `/company/members/:id` | Clerk + admin | Remove member |
| POST | `/company/repos` | Clerk + admin | Onboard repo |
| GET | `/company/repos` | Clerk + company | List repos |
| GET | `/company/repos/:id/contributors` | Clerk + company | Get repo contributors |
| DELETE | `/company/repos/:id` | Clerk + admin | Remove repo |
| PATCH | `/company/repos/:id/token` | Clerk + admin | Rotate PAT |
| POST | `/company/monitored-contributors` | Clerk + admin/manager | Add monitoring config |
| GET | `/company/monitored-contributors` | Clerk + company | List all |
| GET | `/company/monitored-contributors/:id` | Clerk + company | Get one config |
| PATCH | `/company/monitored-contributors/:id` | Clerk + admin/manager | Update config |
| DELETE | `/company/monitored-contributors/:id` | Clerk + admin | Remove config |
| POST | `/company/monitored-contributors/:id/trigger` | Clerk + admin/manager | Manual run |
| POST | `/company/monitored-contributors/:id/resend-invite` | Clerk + admin | Resend invite |
| POST | `/company/teams` | Clerk + admin/manager | Create team |
| GET | `/company/teams` | Clerk + company | List teams |
| GET | `/company/teams/:id` | Clerk + company | Get team |
| PATCH | `/company/teams/:id` | Clerk + admin/manager | Update team |
| DELETE | `/company/teams/:id` | Clerk + admin | Delete team |
| GET | `/company/summary-runs` | Clerk + company | Run history |
| GET | `/company/summary-runs/:id` | Clerk + company | Single run detail |
| GET | `/company/analytics/overview` | Clerk + company | Company-wide analytics |
| GET | `/company/analytics/contributor/:id` | Clerk + company | Per-contributor analytics |
| GET | `/company/analytics/team/:id` | Clerk + company | Team analytics |
| GET | `/company/subscription` | Clerk + company | Plan + usage |
| GET | `/company/plans` | Clerk | All plans |
| POST | `/company/subscription/checkout` | Clerk + admin | Stripe checkout session |
| POST | `/company/subscription/portal` | Clerk + admin | Stripe portal session |
| POST | `/contributor/onboard` | Clerk | Create contributor account |
| PATCH | `/contributor/mail-config` | Clerk + contributor | Connect mail account |
| GET | `/contributor/profile` | Clerk + contributor | Get profile |
| PATCH | `/contributor/note/:monitoredContributorId` | Clerk + contributor | Update note |
| GET | `/contributor/templates` | Clerk + contributor | List templates |
| POST | `/contributor/templates` | Clerk + contributor | Save template |
| PATCH | `/contributor/templates/:id` | Clerk + contributor | Update template |
| DELETE | `/contributor/templates/:id` | Clerk + contributor | Delete template |
| GET | `/contributor/monitoring-slots` | Clerk + contributor | Their monitoring slots |
| GET | `/contributor/summary-runs` | Clerk + contributor | Their run history |
| GET | `/contributor/analytics` | Clerk + contributor | Their analytics |
| GET | `/internal/scheduler/due-runs` | Internal secret | Poll due runs |
| POST | `/internal/runs/execute` | Internal secret | Kick off a run |
| PATCH | `/internal/runs/:id/complete` | Internal secret | Save run result |
