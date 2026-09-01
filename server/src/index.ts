import './loadEnv.js';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAuthConfigured } from './loadEnv.js';
import timerRoutes from './routes/timers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === 'production';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.post('/api/login', async (req, res) => {
  const { password } = req.body as { password?: string };
  const hash = process.env.APP_PASSWORD_HASH;

  if (!hash || !isAuthConfigured()) {
    res.status(500).json({
      error:
        'Server not configured. Set APP_PASSWORD_HASH in .env (use npm run hash-password).',
    });
    return;
  }

  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  const valid = await bcrypt.compare(password, hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  req.session.authenticated = true;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.use('/api/timers', timerRoutes);

if (isProduction) {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export default app;
