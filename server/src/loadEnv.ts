import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// npm workspace scripts run with cwd in server/, but .env lives at repo root.
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envPaths) {
  config({ path: envPath });
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD_HASH?.startsWith('$2'));
}
