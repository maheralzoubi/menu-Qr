// Menu Go app account session (email code sign-in, see server/routes/app.ts).

const TOKEN_KEY = 'mg_token';
const USER_KEY = 'mg_user';

export interface AppAddress { id: string; label: string; line: string }
export interface AppUser { id: string; email: string; name: string; addresses: AppAddress[] }

export function getAppToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && getAppToken() ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveSession(token: string | null, user: AppUser | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (!token && !user) { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
  } catch { /* storage unavailable */ }
}

/** fetch() with the app token attached when signed in. */
export function appFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAppToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}
