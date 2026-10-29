# Rakukun — Production Deployment Guide

This guide covers deploying Rakukun (Next.js SaaS) to production using Docker.

## Prerequisites

- Docker & Docker Compose installed
- A PostgreSQL 16 instance (or use the bundled `postgres:16` service)
- A Redis 7 instance (for shared rate limiting / sessions)
- A Gophish instance (internal network only)
- Amazon SES configured (for training email delivery + webhook)

## 1. Clone & configure environment

```bash
git clone <repo> E:\Rakukun\Rakukun
cd E:\Rakukun\Rakukun\web
cp .env.example .env
```

Edit `.env` and set production values:

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `AUTH_SECRET` | NextAuth secret (32+ random bytes) | Yes |
| `NEXTAUTH_URL` | Public base URL of the app | Yes |
| `GOPHISH_ADMIN_URL` | Gophish admin API base URL | Yes |
| `GOPHISH_ADMIN_API_KEY` | Gophish admin API key | Yes |
| `GOPHISH_KEY_ENCRYPTION_SECRET` | >= 32 char secret for encrypting stored Gophish keys | Yes |
| `ACTIVE_ORG_COOKIE` | Cookie name for active tenant (default `active_org_id`) | No |
| `SES_WEBHOOK_SECRET` | Secret to validate SES/SNS webhook signatures | Yes |

Generate secrets:

```bash
openssl rand -base64 32        # AUTH_SECRET
openssl rand -hex 32           # GOPHISH_KEY_ENCRYPTION_SECRET / SES_WEBHOOK_SECRET
```

## 2. Build the production image

Rakukun uses Next.js **standalone output** (`output: "standalone"` in `next.config.ts`) for a small, fast production image.

From `E:\Rakukun\Rakukun\web`:

```bash
docker build -f Dockerfile.production -t rakukun-web:latest .
```

The Dockerfile is multi-stage:

1. `deps` — installs production dependencies (`npm ci`)
2. `builder` — runs `prisma generate` and `next build`
3. `runner` — copies only the standalone output (`server.js`, `.next/static`, `public`) and runs `node server.js`

## 3. Start the stack

From `E:\Rakukun\Rakukun\web`:

```bash
docker compose up -d
```

Services:

| Service | Image | Notes |
|---|---|---|
| `postgres` | `postgres:16` | Application database |
| `redis` | `redis:7` | Shared rate-limit store & sessions |
| `gophish` | internal build | Gophish admin + phishing API, **no exposed ports** (internal network only) |
| `web` | `Dockerfile.production` | Next.js app, exposed on port 3000 |

## 4. Run database migrations

After the stack is up, run Prisma migrations against the production database:

```bash
docker compose exec web npx prisma migrate deploy
```

If you need to generate the Prisma client:

```bash
docker compose exec web npx prisma generate
```

## 5. SES webhook configuration

Amazon SES sends Bounce / Complaint / Delivery events via SNS to the webhook endpoint:

```
POST https://<your-domain>/api/ses/webhook
```

1. In the AWS SES console, create an SNS topic and subscribe an HTTPS endpoint to it:
   `https://<your-domain>/api/ses/webhook`
2. Confirm the subscription (SES sends a `SubscriptionConfirmation` — the endpoint handles it automatically).
3. Set `SES_WEBHOOK_SECRET` in `.env` and configure signature validation in production (see `web/app/api/ses/webhook/route.ts`).
4. Enable SES event publishing (Bounce, Complaint, Delivery) to the SNS topic.

## 6. Health check

The app exposes a health endpoint:

```
GET http://localhost:3000/api/health
```

Example response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "db": true,
    "gophish": true,
    "redis": true
  }
}
```

The Docker Compose `web` service includes a `healthcheck` that polls this endpoint. Use it with your orchestrator/load balancer for readiness/liveness probes.

## 7. Rate limiting

Rate limiting is enforced on sensitive routes:

- `/api/onboarding/upload-csv`
- `/api/onboarding/test-send`
- `/api/onboarding/launch`
- `/api/ses/webhook` (by source IP)
- login, signup, and password-related endpoints (stricter)

When `REDIS_URL` is set, a shared Redis store is used so limits work across multiple instances. Otherwise an in-memory fallback is used (single-instance only).

## 8. Audit logging

Audit logs are written to the `AuditLog` table for key mutations (templates, pages, groups, SMTP, campaigns, tenant switch, anonymize, test-send, launch). Audit writes are **best-effort** — a failure never breaks the main flow.

## 9. Monitoring & error tracking

- Structured JSON logging via `web/lib/logger.ts` (respects `NODE_ENV`).
- Request logging middleware via `web/lib/middleware-logger.ts` (method, path, status, duration, user ID).
- Structured error logging via `web/lib/errors.ts` (`logError(error, context)`).
- Client-side error reporting endpoint: `POST /api/errors`.

## 10. Stopping

```bash
docker compose down
```

To remove named volumes (database data) as well:

```bash
docker compose down -v
```
