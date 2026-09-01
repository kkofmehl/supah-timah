# Prompt Log

## 2026-09-01

### User Prompt
Build a workout timer web app with:
- Rounds, rest intervals, halfway notifications, split L/R, interval colors, warmups/cooldowns, notification sounds
- Node app with JSON file storage on fly.io volume
- Deploy to fly.io with auto-suspend, cheapest resources
- React + Vite, password gate, mobile-first PWA, phase builder + templates

### Implementation
Full monorepo scaffolded with Express API, React PWA client, shared types, timer engine, templates, and Fly.io deployment config.

### Follow-up: Auth fix
Fixed dotenv not loading root `.env` when server runs from `server/` workspace cwd. Added `loadEnv.ts`, `npm run hash-password`, and quoted hash in `.env.example`.

### Follow-up: Address feedback.md
- Pre-phase 3-2-1 countdown with beeps only at timer start (not before each phase)
- End-of-phase beeps at 3, 2, 1 seconds remaining
- Halfway sound plays three quick tones
- Duplicate button for phases and repeat blocks in timer editor
- Phase type dropdown updates label to match selected type
