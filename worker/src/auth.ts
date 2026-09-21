import type { Context, Next } from 'hono';
import type { Env, AuthUser, UserRole } from './types';

const PBKDF2_ITERATIONS = 100_000;

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function hmacEqual(secret: string, a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const enc = new TextEncoder();
  const sa = await crypto.subtle.sign('HMAC', key, enc.encode(a));
  const sb = await crypto.subtle.sign('HMAC', key, enc.encode(b));
  return bytesToHex(sa) === bytesToHex(sb);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return `pbkdf2:${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(bits)}`;
}

export async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = hexToBytes(parts[2]);
  const expected = parts[3];
  if (!iterations || salt.length === 0 || !expected) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return bytesToHex(bits) === expected;
}

async function matchesBootstrapPassword(env: Env, password: string): Promise<boolean> {
  const expected = env.ADMIN_PASSWORD;
  if (!expected) return false;
  return hmacEqual(env.AUTH_SECRET || 'dev-secret', password, expected);
}

export async function countUsers(env: Env): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  return row?.n ?? 0;
}

export async function createUser(
  env: Env,
  input: { username: string; password: string; role: UserRole },
): Promise<AuthUser> {
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error(
      'Usuario inválido: usá de 3 a 32 caracteres (letras, números, punto, guion o guion bajo)',
    );
  }
  if (input.password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const password_hash = await hashPassword(input.password);
  await env.DB.prepare(
    'INSERT INTO users (id, username, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(id, username, password_hash, input.role, now, now)
    .run();
  return { id, username, role: input.role };
}

export async function findUserByUsername(
  env: Env,
  username: string,
): Promise<{ id: string; username: string; role: UserRole; password_hash: string } | null> {
  return env.DB.prepare(
    'SELECT id, username, role, password_hash FROM users WHERE username = ? COLLATE NOCASE',
  )
    .bind(username.trim())
    .first();
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await env.DB.prepare(
    'INSERT INTO sessions (token, created_at, expires_at, user_id) VALUES (?, ?, ?, ?)',
  )
    .bind(token, now.toISOString(), expires.toISOString(), userId)
    .run();
  return token;
}

export async function destroySession(env: Env, token: string): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
}

export async function destroyUserSessions(env: Env, userId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userId).run();
}

/** First login: if no users exist and password matches ADMIN_PASSWORD secret, create admin. */
export async function login(
  env: Env,
  username: string,
  password: string,
): Promise<{ token: string; user: AuthUser } | null> {
  const total = await countUsers(env);

  if (total === 0) {
    if (!(await matchesBootstrapPassword(env, password))) return null;
    const name = (username || 'admin').trim().toLowerCase() || 'admin';
    const user = await createUser(env, {
      username: name,
      password,
      role: 'admin',
    });
    const token = await createSession(env, user.id);
    return { token, user };
  }

  const row = await findUserByUsername(env, username);
  if (!row) return null;
  if (!(await verifyPasswordHash(password, row.password_hash))) return null;

  const user: AuthUser = { id: row.id, username: row.username, role: row.role };
  const token = await createSession(env, user.id);
  return { token, user };
}

export async function requireAuth(
  c: Context<{ Bindings: Env; Variables: { token: string; user: AuthUser } }>,
  next: Next,
) {
  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'No autorizado' }, 401);

  const row = await c.env.DB.prepare(
    `SELECT s.token, s.expires_at, s.user_id, u.username, u.role
     FROM sessions s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
  )
    .bind(token)
    .first<{
      token: string;
      expires_at: string;
      user_id: string | null;
      username: string | null;
      role: UserRole | null;
    }>();

  if (!row) return c.json({ error: 'Sesión inválida' }, 401);
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await destroySession(c.env, token);
    return c.json({ error: 'Sesión expirada' }, 401);
  }
  if (!row.user_id || !row.username || !row.role) {
    await destroySession(c.env, token);
    return c.json({ error: 'Sesión obsoleta. Volvé a iniciar sesión.' }, 401);
  }

  c.set('token', token);
  c.set('user', { id: row.user_id, username: row.username, role: row.role });
  await next();
}

export async function requireAdmin(
  c: Context<{ Bindings: Env; Variables: { token: string; user: AuthUser } }>,
  next: Next,
) {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Se requiere rol administrador' }, 403);
  }
  await next();
}
