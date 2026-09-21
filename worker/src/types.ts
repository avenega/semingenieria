export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ASSETS: Fetcher;
  ADMIN_PASSWORD: string;
  AUTH_SECRET: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
};

export type UserRole = 'admin' | 'editor';

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type ServiceRow = {
  id: string;
  title: string;
  icon: string;
  items_json: string;
  highlight: number;
  sort_order: number;
};

export type ProjectRow = {
  id: string;
  kind: 'curso' | 'entregada';
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  image_key: string | null;
  sort_order: number;
};

export type GalleryRow = {
  id: string;
  title: string;
  icon: string;
  image_key: string | null;
  sort_order: number;
};

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'nuevo' | 'leido' | 'archivado';
  email_status: 'pendiente' | 'enviado' | 'omitido' | 'error';
  email_error: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};
