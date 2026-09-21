import type { Env } from './types';

export type ContactPayload = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export type EmailConfig = {
  enabled: boolean;
  to: string;
  from: string;
  apiKey: string;
  apiKeyFromEnv: boolean;
  apiKeyConfigured: boolean;
};

export const PRIVATE_SETTING_KEYS = new Set([
  'email_resend_api_key',
  'email_enabled',
  'email_to',
  'email_from',
]);

export function publicSettings(settings: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(settings)) {
    if (!PRIVATE_SETTING_KEYS.has(key)) out[key] = value;
  }
  return out;
}

export async function getEmailConfig(
  env: Env,
  settings?: Record<string, string>,
): Promise<EmailConfig> {
  const s =
    settings ||
    Object.fromEntries(
      (
        (
          await env.DB.prepare('SELECT key, value FROM settings').all<{
            key: string;
            value: string;
          }>()
        ).results || []
      ).map((r) => [r.key, r.value]),
    );

  const apiKeyFromDb = (s.email_resend_api_key || '').trim();
  const apiKeyFromEnv = (env.RESEND_API_KEY || '').trim();
  const apiKey = apiKeyFromDb || apiKeyFromEnv;
  const to = (s.email_to || env.CONTACT_TO_EMAIL || '').trim();
  const from = (s.email_from || env.CONTACT_FROM_EMAIL || '').trim();
  const enabled = (s.email_enabled || '0') === '1';

  return {
    enabled,
    to,
    from,
    apiKey,
    apiKeyFromEnv: Boolean(apiKeyFromEnv),
    apiKeyConfigured: Boolean(apiKey),
  };
}

export async function verifyTurnstile(
  token: string,
  secret: string,
  ip?: string | null,
): Promise<boolean> {
  if (!secret || !token) return false;
  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return Boolean(data.success);
}

/** Envía correo con Resend usando config CMS + secrets de entorno. */
export async function sendContactEmail(
  env: Env,
  payload: ContactPayload,
): Promise<{ status: 'enviado' | 'omitido' | 'error'; error?: string }> {
  const cfg = await getEmailConfig(env);

  if (!cfg.enabled) {
    return { status: 'omitido', error: 'Envío de correo desactivado en configuración' };
  }
  if (!cfg.apiKey) {
    return {
      status: 'omitido',
      error: 'Falta la API key de Resend (configurala en Sistema → Email)',
    };
  }
  if (!cfg.to) {
    return { status: 'omitido', error: 'Falta el correo destino en la configuración' };
  }

  const from = cfg.from || 'onboarding@resend.dev';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `SEM Ingeniería <${from}>`,
        to: [cfg.to],
        reply_to: payload.email,
        subject: `Nueva consulta web — ${payload.name}`,
        text: [
          'Nueva consulta desde el sitio SEM Ingeniería',
          '',
          `Nombre / Empresa: ${payload.name}`,
          `Correo: ${payload.email}`,
          `Teléfono: ${payload.phone || '—'}`,
          '',
          'Mensaje:',
          payload.message,
        ].join('\n'),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return { status: 'error', error: errText.slice(0, 500) };
    }
    return { status: 'enviado' };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Error al enviar correo',
    };
  }
}

export async function sendTestEmail(
  env: Env,
): Promise<{ status: 'enviado' | 'omitido' | 'error'; error?: string }> {
  const cfg = await getEmailConfig(env);
  if (!cfg.apiKey) {
    return { status: 'omitido', error: 'Falta la API key de Resend' };
  }
  if (!cfg.to) {
    return { status: 'omitido', error: 'Falta el correo destino' };
  }
  const from = cfg.from || 'onboarding@resend.dev';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `SEM Ingeniería <${from}>`,
        to: [cfg.to],
        subject: 'Prueba de correo — SEM CMS',
        text: [
          'Este es un correo de prueba enviado desde el panel SEM CMS.',
          '',
          `Destino: ${cfg.to}`,
          `Remitente: ${from}`,
          `Fecha: ${new Date().toISOString()}`,
        ].join('\n'),
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return { status: 'error', error: errText.slice(0, 500) };
    }
    return { status: 'enviado' };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Error al enviar correo de prueba',
    };
  }
}
