# Pulseboard — self-hosted service monitor

Pulseboard is a React and Express uptime dashboard designed to run continuously on a private Proxmox network. Monitoring is performed exclusively by the backend; closing the browser does not stop checks.

It supports three distinct monitor types:

- HTTP/HTTPS checks with response status, duration, timeouts, and normalized network errors.
- ICMP checks using three packets per cycle, including sent/received counts, loss, and min/average/max latency.
- Official public status sources for Google Workspace, Cloudflare, and AWS through isolated provider adapters.

The backend records one result per cycle, opens a single incident when a target goes down, resolves it on recovery, limits concurrency, prevents overlapping checks for a service, and removes measurements older than seven days.

Newly created or edited enabled services are checked immediately. The service details page also offers **Check now** for an on-demand backend check. Provider feed failures are shown as unknown and excluded from uptime percentages.

## Quick start with Docker

Requirements: Docker Engine with Docker Compose and network/firewall access from the Docker host to the targets you want to monitor.

```bash
cp .env.example .env
docker compose up -d --build
```

Open `http://SERVER-IP:3001`. The backend API is published at `http://SERVER-IP:4001`; `GET /api/health` returns `{ "status": "ok" }`. Set `FRONTEND_PORT` and `BACKEND_PORT` in `.env` to other free host ports if needed. The containers keep their own ports (80 and 4000), so Nginx and the backend health check do not need to change when you change host ports.

The named Docker volume `monitor-data` stores `/data/monitor.db` and `/data/uploads`, so database history and logos survive container recreation and restarts. Both containers use `restart: unless-stopped`. The backend receives `NET_RAW`, which is required for ICMP in the container.

To stop the application without removing its data:

```bash
docker compose down
```

Do not add `-v` unless you intentionally want to remove the persistent database volume.

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Purpose |
|---|---:|---|
| `BACKEND_PORT` | `4001` | Published API port |
| `FRONTEND_PORT` | `3001` | Published dashboard port |
| `DATABASE_PATH` | `/data/monitor.db` | SQLite path inside the backend container |
| `UPLOAD_DIR` | `/data/uploads` | Persistent logo directory |
| `MONITOR_INTERVAL_SECONDS` | `60` | Time between scheduler cycles |
| `RETENTION_DAYS` | `7` | Measurement and resolved-incident retention |
| `CLEANUP_INTERVAL_SECONDS` | `3600` | Cleanup frequency |
| `HTTP_TIMEOUT_MS` | `10000` | Default request/ping timeout |
| `MONITOR_CONCURRENCY` | `8` | Maximum checks running concurrently |
| `APP_TIMEZONE` | `Asia/Tbilisi` | Application display timezone |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |

Timestamps are stored as UTC ISO strings. The frontend renders them in `Asia/Tbilisi`.

## Adding monitors

### Home services

Open **Home Services**, select **Add service**, and choose HTTP/HTTPS or ICMP Ping. For an internal web application, use its backend-reachable URL, for example `http://10.10.20.130:8080`. HTTP `200–399` responses are reachable; other responses and network errors are failed checks.

### Ping monitor

Open **Ping Monitor** and add an IP address or hostname. The backend executes `ping` with a fixed argument list and three echo requests. Host input is strictly validated and never interpolated into a shell command.

### External providers

Google Workspace, Cloudflare, and AWS are created automatically. Their implementations live in `backend/src/status-providers` and normalize provider-specific output into operational, degraded, partial outage, major outage, maintenance, or unknown states.

- Google Workspace: official JSON incident history.
- Cloudflare: official Statuspage JSON summary API.
- AWS: official public AWS Health RSS feed. AWS notes that the feed format may change; the adapter is isolated so it can be replaced without changing the scheduler.

## LAN and Proxmox notes

Checks originate inside the backend container. Confirm that the Proxmox host, Docker bridge, VLAN rules, and target firewalls allow traffic from the container to private networks such as `10.10.10.0/24` and `10.10.20.0/24`. Docker bridge networking normally permits routed outbound LAN access; no browser access to the target is required.

If ICMP checks all fail while HTTP checks work, verify that the container has `NET_RAW` (included in Compose), the destination accepts echo requests, and intermediate firewall rules allow ICMP.

## Local development

Requirements: Node.js 22+, npm, and a system `ping` command.

```bash
npm install
npm run install:all
npm run dev
```

For local development, the default Docker `/data` paths automatically map to this project's `data` folder. Vite uses `FRONTEND_PORT` and proxies `/api` and `/uploads` to the locally running Express server on `BACKEND_PORT`. Explicit custom database and upload paths are used as written.

Useful commands:

```bash
npm test
npm run build
```

Tests cover incident transitions, duplicate prevention during long outages, retention cleanup, Linux/Windows ping parsing, and HTTP success/error cases.

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend health |
| `GET/POST` | `/api/services` | List or create services |
| `GET/PUT/DELETE` | `/api/services/:id` | Read, update, or delete a service |
| `POST` | `/api/services/:id/check` | Run or join a backend check now |
| `GET` | `/api/services/:id/results?range=1h\|24h\|7d` | Aggregated graph points |
| `GET` | `/api/services/:id/stats` | Uptime and response statistics |
| `GET` | `/api/services/:id/incidents` | Service incidents |
| `GET` | `/api/dashboard` | Dashboard summary and priority lists |
| `GET` | `/api/incidents?range=today\|24h\|7d` | Filtered incident history |
| `GET` | `/api/external-services` | Provider cards |
| `GET` | `/api/external-services/:id` | Provider and status-change history |

Create/update requests accept `multipart/form-data`. Logos are optional PNG, JPEG, or WEBP files up to 2 MB and are checked by both MIME type and file signature.

## Project structure

```text
frontend/                 React + Vite dashboard
  src/components/        Reusable UI primitives
  src/pages/             Dashboard and management pages
  src/services/          REST client
backend/
  src/controllers/       HTTP request handlers
  src/database/          SQLite initialization and schema
  src/jobs/              Monitor and cleanup schedulers
  src/monitoring/        HTTP/ICMP execution and persistence
  src/routes/            REST route declarations
  src/services/          Domain, statistics, and incident logic
  src/status-providers/  Google, Cloudflare, and AWS adapters
  test/                  Node test suite
data/uploads/            Local persistent data location
```

SQLite uses foreign keys, WAL mode, a busy timeout, cascade deletion, and indexes on service/time and incident timestamps. A partial unique index enforces no more than one ongoing incident per service.
