import { NavLink, Outlet, useMatches, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { ToastHost } from '../flash';
import { ProfileMenu } from '../components/ProfileMenu';

const CONTENT_NAV: Array<{ to: string; label: string; icon: string }> = [
  { to: '/inicio', label: 'Inicio / Nosotros', icon: 'fa-house' },
  { to: '/servicios', label: 'Servicios', icon: 'fa-gears' },
  { to: '/obras', label: 'Obras', icon: 'fa-helmet-safety' },
  { to: '/fotos', label: 'Galería', icon: 'fa-images' },
  { to: '/contacto', label: 'Contacto', icon: 'fa-envelope' },
  { to: '/medios', label: 'Medios', icon: 'fa-folder-open' },
];

type RouteHandle = { title?: string; description?: string };

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const matches = useMatches();
  const handle = [...matches].reverse().find((m) => m.handle)?.handle as RouteHandle | undefined;
  const title = handle?.title || 'Gestión del sitio';
  const description = handle?.description || 'Los cambios se reflejan al instante.';

  useEffect(() => {
    let cancelled = false;
    api<{ unread: number }>('/api/admin/messages')
      .then((data) => {
        if (!cancelled) setUnread(data.unread || 0);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, [matches]);

  if (!user) return null;

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`shell ${navOpen ? 'nav-open' : ''}`}>
      <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} aria-hidden="true" />
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">SEM</div>
          <div className="sidebar-brand-text">
            <strong>SEM CMS</strong>
            <span>Administración</span>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{user.username.slice(0, 1)}</div>
          <div className="sidebar-user-meta">
            <strong>{user.username}</strong>
            <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-editor'}`}>
              {user.role === 'admin' ? 'Admin' : 'Editor'}
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Contenido</div>
          {CONTENT_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setNavOpen(false)}
            >
              <i className={`fa-solid ${item.icon}`} aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
          <div className="nav-section">Bandeja</div>
          <NavLink
            to="/mensajes"
            end={false}
            className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
            onClick={() => setNavOpen(false)}
          >
            <i className="fa-solid fa-inbox" aria-hidden="true" />
            Mensajes
            {unread > 0 && <span className="nav-badge">{unread > 99 ? '99+' : unread}</span>}
          </NavLink>
          {user.role === 'admin' && (
            <>
              <div className="nav-section">Sistema</div>
              <NavLink
                to="/usuarios"
                end={false}
                className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => setNavOpen(false)}
              >
                <i className="fa-solid fa-users-gear" aria-hidden="true" />
                Usuarios
              </NavLink>
              <NavLink
                to="/email"
                className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => setNavOpen(false)}
              >
                <i className="fa-solid fa-envelope-circle-check" aria-hidden="true" />
                Email
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <button className="nav-btn" type="button" onClick={() => void onLogout()}>
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              type="button"
              className="menu-toggle"
              aria-label="Abrir menú"
              onClick={() => setNavOpen((v) => !v)}
            >
              <i className="fa-solid fa-bars" />
            </button>
            <div className="topbar-title">
              <div className="eyebrow">SEM Ingeniería</div>
              <strong>{title}</strong>
              <div className="muted">{description}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <a className="btn btn-ghost btn-sm" href="/" target="_blank" rel="noreferrer">
              <i className="fa-solid fa-arrow-up-right-from-square" />
              Ver sitio
            </a>
            <ProfileMenu user={user} />
          </div>
        </div>

        <div className="content">
          <Outlet />
        </div>
      </main>
      <ToastHost />
    </div>
  );
}
