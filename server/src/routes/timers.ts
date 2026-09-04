import { Router } from 'express';
import type { Timer } from '@supah-timah/shared';
import { requireAuth } from '../auth.js';
import * as store from '../storage/jsonStore.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (_req, res) => {
  const timers = await store.listTimers();
  res.json(timers);
});

router.get('/:id', async (req, res) => {
  const timer = await store.getTimer(req.params.id);
  if (!timer) {
    res.status(404).json({ error: 'Timer not found' });
    return;
  }
  res.json(timer);
});

router.post('/', async (req, res) => {
  const timer = req.body as Timer;
  if (!timer.id || !timer.name) {
    res.status(400).json({ error: 'Invalid timer data' });
    return;
  }
  const created = await store.createTimer(timer);
  res.status(201).json(created);
});

router.put('/:id', async (req, res) => {
  const timer = req.body as Timer;
  if (timer.id !== req.params.id) {
    res.status(400).json({ error: 'ID mismatch' });
    return;
  }
  const updated = await store.updateTimer(timer);
  if (!updated) {
    res.status(404).json({ error: 'Timer not found' });
    return;
  }
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const deleted = await store.deleteTimer(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Timer not found' });
    return;
  }
  res.status(204).send();
});

export default router;
