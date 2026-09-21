import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  countUsers,
  createUser,
  destroySession,
  destroyUserSessions,
  findUserByUsername,
  hashPassword,
  login,
  requireAdmin,
  requireAuth,
  verifyPasswordHash,
} from './auth';
import { getEmailConfig, publicSettings, sendContactEmail, sendTestEmail, verifyTurnstile } from './contact';
import type { AuthUser, ContactMessageRow, Env, GalleryRow, ProjectRow, ServiceRow, UserRole } from './types';

type AppEnv = {
  Bindings: Env;
  Variables: { token: string; user: AuthUser };
};

const app = new Hono<AppEnv>();

app.use('/api/*', cors());

function id() {
  return crypto.randomUUID();
}

async function getSettings(db: D1Database): Promise<Record<string, string>> {
  const { results } = await db.prepare('SELECT key, value FROM settings').all<{
    key: string;
    value: string;
  }>();
  const out: Record<string, string> = {};
  for (const row of results || []) out[row.key] = row.value;
  return out;
}

async function publicPayload(env: Env) {
  const settings = await getSettings(env.DB);
  const services = await env.DB.prepare(
    'SELECT * FROM services ORDER BY sort_order ASC, title ASC',
  ).all<ServiceRow>();
  const projects = await env.DB.prepare(
    'SELECT * FROM projects ORDER BY sort_order ASC, title ASC',
  ).all<ProjectRow>();
  const gallery = await env.DB.prepare(
    'SELECT * FROM gallery ORDER BY sort_order ASC, title ASC',
  ).all<GalleryRow>();

  return {
    settings: publicSettings(settings),
    services: (services.results || []).map((s) => ({
      id: s.id,
      title: s.title,
      icon: s.icon,
      items: JSON.parse(s.items_json || '[]') as string[],
      highlight: Boolean(s.highlight),
      sort_order: s.sort_order,
    })),
    projects: {
      curso: mapProjects((projects.results || []).filter((p) => p.kind === 'curso')),
      entregadas: mapProjects(
        (projects.results || []).filter((p) => p.kind === 'entregada'),
      ),
    },
    gallery: (gallery.results || []).map((g) => ({
      id: g.id,
      title: g.title,
      icon: g.icon,
      image_key: g.image_key,
      image_url: g.image_key ? `/api/public/media/${encodeURIComponent(g.image_key)}` : null,
      sort_order: g.sort_order,
    })),
  };
}

function mapProjects(rows: ProjectRow[]) {
  return rows.map((p) => ({
    id: p.id,
    kind: p.kind,
    title: p.title,
    subtitle: p.subtitle,
    icon: p.icon,
    badge: p.badge,
    image_key: p.image_key,
    image_url: p.image_key ? `/api/public/media/${encodeURIComponent(p.image_key)}` : null,
    sort_order: p.sort_order,
  }));
}

/* ---------- Public ---------- */

app.get('/api/public/site', async (c) => {
  try {
    return c.json(await publicPayload(c.env));
  } catch (err) {
    console.error(err);
    return c.json({ error: 'Error al leer contenido' }, 500);
  }
});

app.get('/api/public/media/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(obj.body, { headers });
});

app.get('/api/public/config', async (c) => {
  const cfg = await getEmailConfig(c.env);
  return c.json({
    turnstileSiteKey: c.env.TURNSTILE_SITE_KEY || '',
    contactEmailEnabled: cfg.enabled && cfg.apiKeyConfigured && Boolean(cfg.to),
  });
});

app.post('/api/public/contact', async (c) => {
  const body = await c.req
    .json<{
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
      turnstileToken?: string;
      website?: string; // honeypot
    }>()
    .catch(() => ({}));

  // Honeypot: bots fill hidden field
  if (body.website) {
    return c.json({ ok: true });
  }

  const name = (body.name || '').trim().slice(0, 120);
  const email = (body.email || '').trim().toLowerCase().slice(0, 160);
  const phone = (body.phone || '').trim().slice(0, 40);
  const message = (body.message || '').trim().slice(0, 5000);
  const turnstileToken = (body.turnstileToken || '').trim();

  if (!name || name.length < 2) {
    return c.json({ error: 'Ingresá tu nombre o empresa' }, 400);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Ingresá un correo válido' }, 400);
  }
  if (!message || message.length < 10) {
    return c.json({ error: 'El mensaje debe tener al menos 10 caracteres' }, 400);
  }

  const secret = c.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return c.json({ error: 'Captcha no configurado en el servidor' }, 503);
  }
  if (!turnstileToken) {
    return c.json({ error: 'Completá el captcha' }, 400);
  }

  const ip = c.req.header('CF-Connecting-IP') || c.req.header('x-forwarded-for') || null;
  const okCaptcha = await verifyTurnstile(turnstileToken, secret, ip);
  if (!okCaptcha) {
    return c.json({ error: 'Captcha inválido. Volvé a intentarlo.' }, 400);
  }

  // Simple rate limit: max 5 messages per IP in last hour
  if (ip) {
    const recent = await c.env.DB.prepare(
      `SELECT COUNT(*) AS n FROM contact_messages
       WHERE ip = ? AND created_at >= datetime('now', '-1 hour')`,
    )
      .bind(ip)
      .first<{ n: number }>();
    if ((recent?.n ?? 0) >= 5) {
      return c.json({ error: 'Demasiados mensajes. Probá de nuevo más tarde.' }, 429);
    }
  }

  const messageId = id();
  const now = new Date().toISOString();
  const emailResult = await sendContactEmail(c.env, { name, email, phone, message });

  await c.env.DB.prepare(
    `INSERT INTO contact_messages
      (id, name, email, phone, message, status, email_status, email_error, ip, user_agent, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'nuevo', ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      messageId,
      name,
      email,
      phone,
      message,
      emailResult.status,
      emailResult.error || null,
      ip,
      (c.req.header('user-agent') || '').slice(0, 300),
      now,
      now,
    )
    .run();

  return c.json({
    ok: true,
    id: messageId,
    email: emailResult.status,
  });
});

/* ---------- Auth ---------- */

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>().catch(() => ({}));
  const username = (body.username || '').trim();
  const password = body.password || '';
  if (!password) return c.json({ error: 'Contraseña requerida' }, 400);

  const total = await countUsers(c.env);
  if (total > 0 && !username) {
    return c.json({ error: 'Usuario y contraseña requeridos' }, 400);
  }

  try {
    const result = await login(c.env, username || 'admin', password);
    if (!result) return c.json({ error: 'Credenciales incorrectas' }, 401);
    return c.json({ token: result.token, user: result.user });
  } catch (err) {
    console.error(err);
    return c.json(
      { error: err instanceof Error ? err.message : 'Error al iniciar sesión' },
      400,
    );
  }
});

app.post('/api/auth/logout', requireAuth, async (c) => {
  await destroySession(c.env, c.get('token'));
  return c.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (c) => c.json({ ok: true, user: c.get('user') }));

app.post('/api/auth/password', requireAuth, async (c) => {
  const me = c.get('user');
  const body = await c.req
    .json<{ currentPassword?: string; newPassword?: string }>()
    .catch(() => ({}));
  const currentPassword = body.currentPassword || '';
  const newPassword = body.newPassword || '';

  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Completá la contraseña actual y la nueva' }, 400);
  }
  if (newPassword.length < 8) {
    return c.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' }, 400);
  }
  if (currentPassword === newPassword) {
    return c.json({ error: 'La nueva contraseña debe ser distinta a la actual' }, 400);
  }

  const row = await c.env.DB.prepare(
    'SELECT id, password_hash FROM users WHERE id = ?',
  )
    .bind(me.id)
    .first<{ id: string; password_hash: string }>();
  if (!row) return c.json({ error: 'Usuario no encontrado' }, 404);

  if (!(await verifyPasswordHash(currentPassword, row.password_hash))) {
    return c.json({ error: 'La contraseña actual es incorrecta' }, 401);
  }

  const password_hash = await hashPassword(newPassword);
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
  )
    .bind(password_hash, new Date().toISOString(), me.id)
    .run();

  // Keep current session; invalidate others
  await c.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?')
    .bind(me.id, c.get('token'))
    .run();

  return c.json({ ok: true });
});

/* ---------- Admin: users ---------- */

app.get('/api/admin/users', requireAuth, requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, username, role, created_at, updated_at FROM users ORDER BY username ASC',
  ).all();
  return c.json({ items: results || [] });
});

app.get('/api/admin/users/:id', requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param('id');
  const user = await c.env.DB.prepare(
    'SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?',
  )
    .bind(userId)
    .first();
  if (!user) return c.json({ error: 'Usuario no encontrado' }, 404);
  return c.json({ user });
});

app.post('/api/admin/users', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json<{ username?: string; password?: string; role?: UserRole }>();
  const role: UserRole = body.role === 'admin' ? 'admin' : 'editor';
  try {
    const existing = body.username ? await findUserByUsername(c.env, body.username) : null;
    if (existing) return c.json({ error: 'Ese usuario ya existe' }, 409);
    const user = await createUser(c.env, {
      username: body.username || '',
      password: body.password || '',
      role,
    });
    return c.json({ user }, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Error' }, 400);
  }
});

app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param('id');
  const body = await c.req.json<{ password?: string; role?: UserRole }>();
  const target = await c.env.DB.prepare(
    'SELECT id, username, role FROM users WHERE id = ?',
  )
    .bind(userId)
    .first<{ id: string; username: string; role: UserRole }>();
  if (!target) return c.json({ error: 'Usuario no encontrado' }, 404);

  if (body.role && body.role !== target.role) {
    if (body.role !== 'admin' && body.role !== 'editor') {
      return c.json({ error: 'Rol inválido' }, 400);
    }
    if (target.role === 'admin' && body.role === 'editor') {
      const admins = await c.env.DB.prepare(
        "SELECT COUNT(*) AS n FROM users WHERE role = 'admin'",
      ).first<{ n: number }>();
      if ((admins?.n ?? 0) <= 1) {
        return c.json({ error: 'No se puede quitar el último administrador' }, 400);
      }
    }
    await c.env.DB.prepare(
      'UPDATE users SET role = ?, updated_at = ? WHERE id = ?',
    )
      .bind(body.role, new Date().toISOString(), userId)
      .run();
  }

  if (body.password) {
    if (body.password.length < 8) {
      return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);
    }
    const password_hash = await hashPassword(body.password);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
    )
      .bind(password_hash, new Date().toISOString(), userId)
      .run();
    await destroyUserSessions(c.env, userId);
  }

  const updated = await c.env.DB.prepare(
    'SELECT id, username, role, created_at, updated_at FROM users WHERE id = ?',
  )
    .bind(userId)
    .first();
  return c.json({ user: updated });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param('id');
  const me = c.get('user');
  if (userId === me.id) {
    return c.json({ error: 'No podés eliminar tu propio usuario' }, 400);
  }

  const target = await c.env.DB.prepare('SELECT id, role FROM users WHERE id = ?')
    .bind(userId)
    .first<{ id: string; role: UserRole }>();
  if (!target) return c.json({ error: 'Usuario no encontrado' }, 404);

  if (target.role === 'admin') {
    const admins = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM users WHERE role = 'admin'",
    ).first<{ n: number }>();
    if ((admins?.n ?? 0) <= 1) {
      return c.json({ error: 'No se puede eliminar el último administrador' }, 400);
    }
  }

  await destroyUserSessions(c.env, userId);
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  return c.json({ ok: true });
});

/* ---------- Admin: settings ---------- */

app.get('/api/admin/site', requireAuth, async (c) => c.json(await publicPayload(c.env)));

app.put('/api/admin/settings', requireAuth, async (c) => {
  const body = await c.req.json<Record<string, string>>();
  const stmts = Object.entries(body)
    .filter(([key]) => !key.startsWith('email_'))
    .map(([key, value]) =>
      c.env.DB.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ).bind(key, String(value ?? '')),
    );
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

/* ---------- Admin: email config ---------- */

app.get('/api/admin/email-config', requireAuth, requireAdmin, async (c) => {
  const cfg = await getEmailConfig(c.env);
  return c.json({
    enabled: cfg.enabled,
    to: cfg.to,
    from: cfg.from,
    apiKeyConfigured: cfg.apiKeyConfigured,
    apiKeyFromEnv: cfg.apiKeyFromEnv,
    apiKeyMasked: cfg.apiKeyConfigured
      ? `••••••••${cfg.apiKey.slice(-4)}`
      : '',
  });
});

app.put('/api/admin/email-config', requireAuth, requireAdmin, async (c) => {
  const body = await c.req
    .json<{
      enabled?: boolean;
      to?: string;
      from?: string;
      apiKey?: string;
      clearApiKey?: boolean;
    }>()
    .catch(() => ({}));

  const to = String(body.to ?? '').trim();
  const from = String(body.from ?? '').trim();
  if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return c.json({ error: 'Correo destino inválido' }, 400);
  }
  if (from && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) {
    return c.json({ error: 'Correo remitente inválido' }, 400);
  }

  const stmts = [
    c.env.DB.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ).bind('email_enabled', body.enabled ? '1' : '0'),
    c.env.DB.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ).bind('email_to', to),
    c.env.DB.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ).bind('email_from', from),
  ];

  if (body.clearApiKey) {
    stmts.push(
      c.env.DB.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ).bind('email_resend_api_key', ''),
    );
  } else if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
    stmts.push(
      c.env.DB.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ).bind('email_resend_api_key', body.apiKey.trim()),
    );
  }

  await c.env.DB.batch(stmts);
  const cfg = await getEmailConfig(c.env);
  return c.json({
    ok: true,
    enabled: cfg.enabled,
    to: cfg.to,
    from: cfg.from,
    apiKeyConfigured: cfg.apiKeyConfigured,
    apiKeyFromEnv: cfg.apiKeyFromEnv,
    apiKeyMasked: cfg.apiKeyConfigured ? `••••••••${cfg.apiKey.slice(-4)}` : '',
  });
});

app.post('/api/admin/email-config/test', requireAuth, requireAdmin, async (c) => {
  const result = await sendTestEmail(c.env);
  if (result.status === 'enviado') {
    return c.json({ ok: true, message: 'Correo de prueba enviado' });
  }
  if (result.status === 'omitido') {
    return c.json({ error: result.error || 'Correo no configurado' }, 400);
  }
  return c.json({ error: result.error || 'Error al enviar' }, 502);
});

/* ---------- Admin: services ---------- */

app.put('/api/admin/services', requireAuth, async (c) => {
  const items = await c.req.json<
    Array<{
      id?: string;
      title: string;
      icon: string;
      items: string[];
      highlight?: boolean;
      sort_order?: number;
    }>
  >();

  await c.env.DB.prepare('DELETE FROM services').run();
  const stmts = items.map((item, index) =>
    c.env.DB.prepare(
      'INSERT INTO services (id, title, icon, items_json, highlight, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      item.id || id(),
      item.title,
      item.icon || 'fa-plug',
      JSON.stringify(item.items || []),
      item.highlight ? 1 : 0,
      item.sort_order ?? index + 1,
    ),
  );
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

/* ---------- Admin: projects ---------- */

app.put('/api/admin/projects', requireAuth, async (c) => {
  const body = await c.req.json<{
    curso: Array<{
      id?: string;
      title: string;
      subtitle?: string;
      icon?: string;
      badge?: string;
      image_key?: string | null;
      sort_order?: number;
    }>;
    entregadas: Array<{
      id?: string;
      title: string;
      subtitle?: string;
      icon?: string;
      badge?: string;
      image_key?: string | null;
      sort_order?: number;
    }>;
  }>();

  await c.env.DB.prepare('DELETE FROM projects').run();
  const rows = [
    ...(body.curso || []).map((p, i) => ({ ...p, kind: 'curso' as const, i })),
    ...(body.entregadas || []).map((p, i) => ({ ...p, kind: 'entregada' as const, i })),
  ];
  const stmts = rows.map((p) =>
    c.env.DB.prepare(
      'INSERT INTO projects (id, kind, title, subtitle, icon, badge, image_key, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      p.id || id(),
      p.kind,
      p.title,
      p.subtitle || '',
      p.icon || 'fa-helmet-safety',
      p.badge || (p.kind === 'curso' ? 'En Ejecución' : 'Entregada'),
      p.image_key || null,
      p.sort_order ?? p.i + 1,
    ),
  );
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

/* ---------- Admin: gallery ---------- */

app.put('/api/admin/gallery', requireAuth, async (c) => {
  const items = await c.req.json<
    Array<{
      id?: string;
      title: string;
      icon?: string;
      image_key?: string | null;
      sort_order?: number;
    }>
  >();
  await c.env.DB.prepare('DELETE FROM gallery').run();
  const stmts = items.map((g, index) =>
    c.env.DB.prepare(
      'INSERT INTO gallery (id, title, icon, image_key, sort_order) VALUES (?, ?, ?, ?, ?)',
    ).bind(
      g.id || id(),
      g.title,
      g.icon || 'fa-image',
      g.image_key || null,
      g.sort_order ?? index + 1,
    ),
  );
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

/* ---------- Admin: contact messages ---------- */

app.get('/api/admin/messages', requireAuth, async (c) => {
  const status = c.req.query('status') || '';
  let sql =
    'SELECT id, name, email, phone, message, status, email_status, email_error, created_at, updated_at FROM contact_messages';
  const binds: string[] = [];
  if (status === 'nuevo' || status === 'leido' || status === 'archivado') {
    sql += ' WHERE status = ?';
    binds.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const stmt = c.env.DB.prepare(sql);
  const { results } = binds.length
    ? await stmt.bind(...binds).all<ContactMessageRow>()
    : await stmt.all<ContactMessageRow>();

  const unread = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM contact_messages WHERE status = 'nuevo'",
  ).first<{ n: number }>();

  return c.json({ items: results || [], unread: unread?.n ?? 0 });
});

app.get('/api/admin/messages/:id', requireAuth, async (c) => {
  const row = await c.env.DB.prepare('SELECT * FROM contact_messages WHERE id = ?')
    .bind(c.req.param('id'))
    .first<ContactMessageRow>();
  if (!row) return c.json({ error: 'Mensaje no encontrado' }, 404);

  if (row.status === 'nuevo') {
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      "UPDATE contact_messages SET status = 'leido', updated_at = ? WHERE id = ?",
    )
      .bind(now, row.id)
      .run();
    row.status = 'leido';
    row.updated_at = now;
  }

  return c.json({ message: row });
});

app.patch('/api/admin/messages/:id', requireAuth, async (c) => {
  const messageId = c.req.param('id');
  const body = await c.req.json<{ status?: string }>().catch(() => ({}));
  const status = body.status;
  if (status !== 'nuevo' && status !== 'leido' && status !== 'archivado') {
    return c.json({ error: 'Estado inválido' }, 400);
  }
  const existing = await c.env.DB.prepare('SELECT id FROM contact_messages WHERE id = ?')
    .bind(messageId)
    .first();
  if (!existing) return c.json({ error: 'Mensaje no encontrado' }, 404);

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE contact_messages SET status = ?, updated_at = ? WHERE id = ?',
  )
    .bind(status, now, messageId)
    .run();

  const message = await c.env.DB.prepare('SELECT * FROM contact_messages WHERE id = ?')
    .bind(messageId)
    .first();
  return c.json({ message });
});

app.delete('/api/admin/messages/:id', requireAuth, async (c) => {
  const messageId = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM contact_messages WHERE id = ?')
    .bind(messageId)
    .first();
  if (!existing) return c.json({ error: 'Mensaje no encontrado' }, 404);
  await c.env.DB.prepare('DELETE FROM contact_messages WHERE id = ?').bind(messageId).run();
  return c.json({ ok: true });
});

/* ---------- Admin: media ---------- */

app.get('/api/admin/media', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM media ORDER BY created_at DESC',
  ).all();
  return c.json({
    items: (results || []).map((m: Record<string, unknown>) => ({
      ...m,
      url: `/api/public/media/${encodeURIComponent(String(m.object_key))}`,
    })),
  });
});

app.post('/api/admin/media', requireAuth, async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return c.json({ error: 'Archivo requerido' }, 400);

  const maxBytes = 8 * 1024 * 1024; // 8 MB
  if (file.size > maxBytes) {
    return c.json({ error: 'La imagen supera 8 MB' }, 400);
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (file.type && !allowed.includes(file.type)) {
    return c.json({ error: 'Formato no permitido. Usá JPG, PNG, WebP o GIF.' }, 400);
  }

  const mediaId = id();
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const objectKey = `uploads/${mediaId}-${safeName}`;
  const bytes = await file.arrayBuffer();
  await c.env.MEDIA.put(objectKey, bytes, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });
  await c.env.DB.prepare(
    'INSERT INTO media (id, object_key, filename, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(
      mediaId,
      objectKey,
      file.name,
      file.type || 'application/octet-stream',
      file.size,
      new Date().toISOString(),
    )
    .run();

  return c.json({
    id: mediaId,
    object_key: objectKey,
    url: `/api/public/media/${encodeURIComponent(objectKey)}`,
  });
});

app.delete('/api/admin/media/:id', requireAuth, async (c) => {
  const mediaId = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT object_key FROM media WHERE id = ?')
    .bind(mediaId)
    .first<{ object_key: string }>();
  if (!row) return c.json({ error: 'No encontrado' }, 404);
  await c.env.MEDIA.delete(row.object_key);
  await c.env.DB.prepare('DELETE FROM media WHERE id = ?').bind(mediaId).run();
  return c.json({ ok: true });
});

/* ---------- Assets / SPA fallback ---------- */

app.all('*', async (c) => {
  const url = new URL(c.req.url);
  const res = await c.env.ASSETS.fetch(c.req.raw);

  // Admin SPA deep links
  if (res.status === 404 && url.pathname.startsWith('/admin')) {
    const indexReq = new Request(new URL('/admin/index.html', url.origin), c.req.raw);
    return c.env.ASSETS.fetch(indexReq);
  }

  return res;
});

export default app;
