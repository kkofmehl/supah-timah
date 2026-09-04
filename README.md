# Supah Timah

A mobile-first workout timer PWA for HIIT, circuits, Tabata, EMOM, and custom interval training. Built with React + Express, persisted to JSON on a Fly.io volume.

## Features

- **Timer types**: Simple intervals, HIIT, Tabata, Circuit, EMOM, or free-form phase builder
- **Rounds & rest**: Repeat blocks with configurable rest between rounds
- **Halfway notifications** and **L/R split** with switch duration
- **Per-interval colors** (full-screen during workout)
- **Warmup / cooldown** phases
- **Notification sounds** for interval start/end, halfway, switch, rest, get ready, countdown, complete
- **Password-protected** single-user access
- **PWA** with screen wake lock and server keepalive while a workout is running
- **Fly.io** auto-stop/start for minimal cost (keepalive prevents suspend mid-timer)

## Local Development

### Prerequisites

- Node.js 22+
- npm

### Setup

```bash
npm install
npm run build -w shared
```

Generate a password hash and add it to `.env` at the project root:

```bash
npm run hash-password -- your-password
```

Copy the output into `.env`. **Use single quotes** around the hash (it contains `$` characters):

```bash
APP_PASSWORD_HASH='$2b$10$...'
SESSION_SECRET=any-random-string
```

**Important:** `APP_PASSWORD_HASH` must be the bcrypt hash, not your plain password.

Create `.env` in the project root (or export variables):

```bash
export APP_PASSWORD_HASH='$2b$10$...'
export SESSION_SECRET="<random-string>"
export DATA_DIR="./data"
export NODE_ENV=development
```

### Run

```bash
npm run dev
```

- Client: http://localhost:5173 (proxies API to server)
- Server: http://localhost:3000

### Test

```bash
npm test
```

## Deploy to Fly.io

### First-time setup

```bash
fly apps create supah-timah
fly volumes create timah_data --region iad --size 1
fly secrets set APP_PASSWORD_HASH="<bcrypt-hash>" SESSION_SECRET="<random-string>"
fly deploy
```

### Secrets

| Variable | Description |
|----------|-------------|
| `APP_PASSWORD_HASH` | bcrypt hash of your login password |
| `SESSION_SECRET` | Random string for session cookies |

Generate hash:

```bash
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('your-password', 10).then(console.log)"
```

The app uses `shared-cpu-1x` with 256MB RAM and auto-stops when idle.

## Project Structure

```
supah-timah/
├── client/          React + Vite PWA
├── server/          Express API + static file serving
├── shared/          Shared TypeScript types
├── data/            Local JSON storage (gitignored)
├── Dockerfile
└── fly.toml
```
