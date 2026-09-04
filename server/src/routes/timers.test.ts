import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { createId, DEFAULT_SOUND_SETTINGS } from '@supah-timah/shared';
import type { Timer } from '@supah-timah/shared';
import timerRoutes from '../routes/timers.js';
import { requireAuth } from '../auth.js';
import { clearCache } from '../storage/jsonStore.js';

let tmpDir: string;
const TEST_PASSWORD = 'testpass';
let passwordHash: string;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }),
  );

  app.post('/api/login', async (req, res) => {
    const { password } = req.body as { password?: string };
    const valid = await bcrypt.compare(password ?? '', passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
    req.session.authenticated = true;
    res.json({ ok: true });
  });

  app.get('/api/ping', requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/timers', timerRoutes);
  return app;
}

function makeTimer(name = 'Test'): Timer {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    globalSounds: { ...DEFAULT_SOUND_SETTINGS },
    nodes: [
      {
        kind: 'phase',
        id: createId(),
        type: 'work',
        label: 'Work',
        durationSeconds: 30,
        color: '#E74C3C',
        halfwayNotification: false,
      },
    ],
  };
}

describe('timers API', () => {
  let app: express.Application;
  let agent: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'timah-test-'));
    process.env.DATA_DIR = tmpDir;
    clearCache();
    passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
    app = createTestApp();
    agent = request.agent(app);
  });

  afterEach(async () => {
    clearCache();
    delete process.env.DATA_DIR;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/timers');
    expect(res.status).toBe(401);
  });

  it('serves authenticated keepalive ping', async () => {
    const unauth = await request(app).get('/api/ping');
    expect(unauth.status).toBe(401);

    await agent.post('/api/login').send({ password: TEST_PASSWORD });
    const res = await agent.get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('creates and lists timers', async () => {
    await agent.post('/api/login').send({ password: TEST_PASSWORD });

    const timer = makeTimer('HIIT');
    const createRes = await agent.post('/api/timers').send(timer);
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('HIIT');

    const listRes = await agent.get('/api/timers');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].totalDurationSeconds).toBe(30);
  });

  it('gets, updates, and deletes a timer', async () => {
    await agent.post('/api/login').send({ password: TEST_PASSWORD });
    const timer = makeTimer();
    await agent.post('/api/timers').send(timer);

    const getRes = await agent.get(`/api/timers/${timer.id}`);
    expect(getRes.status).toBe(200);

    const updated = { ...timer, name: 'Updated' };
    const putRes = await agent.put(`/api/timers/${timer.id}`).send(updated);
    expect(putRes.body.name).toBe('Updated');

    const delRes = await agent.delete(`/api/timers/${timer.id}`);
    expect(delRes.status).toBe(204);

    const notFound = await agent.get(`/api/timers/${timer.id}`);
    expect(notFound.status).toBe(404);
  });
});

describe('requireAuth', () => {
  it('blocks unauthenticated', () => {
    const req = { session: {} } as express.Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as express.Response;
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
