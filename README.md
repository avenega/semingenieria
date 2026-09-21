# SEM Ingeniería

Sitio corporativo en Astro + CMS nativo en Cloudflare (Workers + D1 + R2 + admin React).

## URLs

- Sitio: `/`
- Admin CMS: `/admin/`
- API pública: `/api/public/site`

## Desarrollo

```bash
npm install
cd admin && npm install && cd ..

# Migraciones locales
npm run db:migrate:local

# Worker + assets (otra terminal: admin vite si querés)
npm run build
npm run dev:worker
```

Admin en desarrollo aislado: `npm run dev:admin` (proxy a `:8787`).

## Deploy

```bash
npm run db:migrate
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put AUTH_SECRET
npx wrangler secret put TURNSTILE_SECRET_KEY
# Opcional — envío de correos (Resend)
# npx wrangler secret put RESEND_API_KEY
# npx wrangler secret put CONTACT_TO_EMAIL
# npx wrangler secret put CONTACT_FROM_EMAIL
npm run deploy
```

### Formulario de contacto

- Guarda cada consulta en D1 (`contact_messages`).
- Visible en el CMS: `/admin/mensajes`.
- Captcha: [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/).
- Correo: configurable en **Sistema → Email** (`/admin/email`) con [Resend](https://resend.com/).
  También podés usar el secreto `RESEND_API_KEY` de Wrangler como respaldo.

En producción, creá un widget Turnstile en el dashboard de Cloudflare y reemplazá:

- `vars.TURNSTILE_SITE_KEY` en `wrangler.jsonc`
- secret `TURNSTILE_SECRET_KEY`

Las keys de prueba actuales siempre aprueban el captcha (útiles en desarrollo).

### Primer acceso al CMS

1. Entrá a `/admin/login` con usuario `admin` y la contraseña definida en `ADMIN_PASSWORD`.
2. Eso crea el primer administrador (solo si aún no hay usuarios).
3. Desde `/admin/usuarios` podés gestionar cuentas (CRUD: listar, crear, editar, eliminar).

El admin es multipágina (React Router): cada menú tiene su URL (`/admin/inicio`, `/admin/servicios`, `/admin/usuarios/nuevo`, etc.).

`ADMIN_PASSWORD` solo sirve para ese bootstrap inicial; después el login usa la tabla `users`.


