const TOKEN_KEY = 'sem_cms_token';

const HTTP_ERROR_ES: Record<number, string> = {
  400: 'Solicitud inválida',
  401: 'No autorizado',
  403: 'Acceso denegado',
  404: 'No encontrado',
  409: 'El recurso ya existe',
  413: 'El archivo es demasiado grande',
  422: 'Datos no válidos',
  429: 'Demasiados intentos. Probá de nuevo en unos minutos',
  500: 'Error interno del servidor',
  502: 'Servicio no disponible',
  503: 'Servicio no disponible',
};

const ENGLISH_STATUS = new Set([
  'bad request',
  'unauthorized',
  'forbidden',
  'not found',
  'method not allowed',
  'conflict',
  'payload too large',
  'unprocessable entity',
  'too many requests',
  'internal server error',
  'bad gateway',
  'service unavailable',
  'gateway timeout',
  'ok',
  'created',
  'no content',
]);

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function humanizeApiError(status: number, raw?: string): string {
  const text = (raw || '').trim();
  if (text && !ENGLISH_STATUS.has(text.toLowerCase())) return text;
  return HTTP_ERROR_ES[status] || 'Error de comunicación con el servidor';
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisá tu conexión.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '' }));
    throw new Error(
      humanizeApiError(res.status, (err as { error?: string }).error || res.statusText),
    );
  }
  return res.json() as Promise<T>;
}

export async function uploadMedia(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  return api<{ id: string; object_key: string; url: string }>('/api/admin/media', {
    method: 'POST',
    body: fd,
  });
}

export type ProjectItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  image_url?: string | null;
  image_key?: string | null;
  sort_order: number;
};

export type GalleryItem = {
  id: string;
  title: string;
  icon: string;
  image_url: string | null;
  image_key?: string | null;
  sort_order: number;
};

export type SitePayload = {
  settings: Record<string, string>;
  services: Array<{
    id: string;
    title: string;
    icon: string;
    items: string[];
    highlight: boolean;
    sort_order: number;
  }>;
  projects: {
    curso: ProjectItem[];
    entregadas: ProjectItem[];
  };
  gallery: GalleryItem[];
};

export type UserRole = 'admin' | 'editor';

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type CmsUser = AuthUser & {
  created_at: string;
  updated_at: string;
};
