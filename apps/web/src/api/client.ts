/**
 * Demo API client. Every call stays in memory — this branch does not reach a server.
 */
import type { SessionResponse } from '@bottle-flip/shared';
import { DemoFault, demoCall, demoReset, demoSession } from '../demo/store';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const sessionListeners = new Set<(s: SessionResponse) => void>();

export function onSession(fn: (s: SessionResponse) => void) {
  sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
}

export function setSession(s: SessionResponse) {
  for (const fn of sessionListeners) fn(s);
}

let booting: Promise<SessionResponse> | null = null;

/** Starts the sample Ethiopian player. There is no refresh cookie and no device call. */
export function bootstrapSession(): Promise<SessionResponse> {
  booting ??= Promise.resolve()
    .then(() => {
      const session = demoSession();
      setSession(session);
      return session;
    })
    .finally(() => {
      booting = null;
    });
  return booting;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  try {
    return await demoCall<T>(path, init);
  } catch (e) {
    if (e instanceof DemoFault) throw new ApiError(e.status, e.code, e.message);
    throw e;
  }
}

/** Restores the seeded player so the walkthrough can be shown again. */
export async function logout() {
  demoReset();
  return bootstrapSession();
}
