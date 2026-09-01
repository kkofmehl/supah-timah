import type { Timer, TimerSummary } from '@supah-timah/shared';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(
      (body as { error?: string }).error ?? response.statusText,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function login(password: string): Promise<void> {
  await request('/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function logout(): Promise<void> {
  await request('/api/logout', { method: 'POST' });
}

export async function checkAuth(): Promise<boolean> {
  try {
    await request('/api/timers');
    return true;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return false;
    throw e;
  }
}

export async function listTimers(): Promise<TimerSummary[]> {
  return request<TimerSummary[]>('/api/timers');
}

export async function getTimer(id: string): Promise<Timer> {
  return request<Timer>(`/api/timers/${id}`);
}

export async function createTimer(timer: Timer): Promise<Timer> {
  return request<Timer>('/api/timers', {
    method: 'POST',
    body: JSON.stringify(timer),
  });
}

export async function updateTimer(timer: Timer): Promise<Timer> {
  return request<Timer>(`/api/timers/${timer.id}`, {
    method: 'PUT',
    body: JSON.stringify(timer),
  });
}

export async function deleteTimer(id: string): Promise<void> {
  await request(`/api/timers/${id}`, { method: 'DELETE' });
}

export { ApiError };
