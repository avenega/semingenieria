/** Allowlist de keys de settings editables desde el CMS (no email_*). */
export const ALLOWED_SETTING_KEYS = new Set([
  'site_name',
  'hero_tagline',
  'about_p1',
  'about_p2',
  'vision',
  'mission',
  'commitment',
  'pillar_1_title',
  'pillar_1_text',
  'pillar_1_icon',
  'pillar_2_title',
  'pillar_2_text',
  'pillar_2_icon',
  'pillar_3_title',
  'pillar_3_text',
  'pillar_3_icon',
  'contact_phone',
  'contact_email',
  'contact_whatsapp',
  'contact_hours_week',
  'contact_hours_sat',
  'coverage_text',
  'curso_intro',
  'fotos_intro',
]);

const MAX_SETTING_VALUE_CHARS = 20_000;

export function filterSettingsUpdate(
  body: Record<string, unknown>,
): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_SETTING_KEYS.has(key)) continue;
    if (key.startsWith('email_')) continue;
    const str = String(value ?? '').slice(0, MAX_SETTING_VALUE_CHARS);
    out.push([key, str]);
  }
  return out;
}

/** Detecta tipo de imagen por magic bytes. */
export function sniffImageMime(bytes: ArrayBuffer): string | null {
  const u = new Uint8Array(bytes);
  if (u.length < 12) return null;
  // JPEG
  if (u[0] === 0xff && u[1] === 0xd8 && u[2] === 0xff) return 'image/jpeg';
  // PNG
  if (u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4e && u[3] === 0x47) return 'image/png';
  // GIF
  if (u[0] === 0x47 && u[1] === 0x49 && u[2] === 0x46 && u[3] === 0x38) return 'image/gif';
  // WEBP: RIFF....WEBP
  if (
    u[0] === 0x52 &&
    u[1] === 0x49 &&
    u[2] === 0x46 &&
    u[3] === 0x46 &&
    u[8] === 0x57 &&
    u[9] === 0x45 &&
    u[10] === 0x42 &&
    u[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

const CORS_ORIGINS = [
  'https://semingenieria.com.py',
  'https://www.semingenieria.com.py',
  'https://semingenieria.semingepy.workers.dev',
];

export function isAllowedCorsOrigin(origin: string | undefined | null): boolean {
  if (!origin) return false;
  if (CORS_ORIGINS.includes(origin)) return true;
  // Local admin / astro / vite
  if (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  ) {
    return true;
  }
  return false;
}
