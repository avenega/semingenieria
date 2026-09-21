import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom';
import { useAuth } from './auth';
import { FlashProvider } from './flash';
import { AdminLayout } from './layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { ContentWorkspace, type ContentSection } from './pages/ContentWorkspace';
import { UsersListPage } from './pages/UsersListPage';
import { UserFormPage } from './pages/UserFormPage';
import { MessagesListPage } from './pages/MessagesListPage';
import { MessageDetailPage } from './pages/MessageDetailPage';
import { EmailConfigPage } from './pages/EmailConfigPage';
import { SiteProvider } from './site';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="muted">Cargando panel…</p>
    </div>
  );
}

function RequireAuth() {
  const { ready, user } = useAuth();
  if (!ready) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <FlashProvider>
      <SiteProvider>
        <Outlet />
      </SiteProvider>
    </FlashProvider>
  );
}

function RequireAdmin() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/inicio" replace />;
  return <Outlet />;
}

const contentHandles = {
  inicio: {
    title: 'Inicio y Sobre Nosotros',
    description: 'Hero, textos institucionales y pilares.',
  },
  servicios: {
    title: 'Servicios',
    description: 'Catálogo de servicios e ítems destacados.',
  },
  obras: {
    title: 'Obras',
    description: 'Proyectos en curso y entregados con imágenes.',
  },
  fotos: {
    title: 'Galería',
    description: 'Fotos de obras publicadas en el sitio.',
  },
  contacto: {
    title: 'Contacto',
    description: 'Teléfono, correo, WhatsApp y cobertura.',
  },
  medios: {
    title: 'Biblioteca de medios',
    description: 'Archivos alojados en R2 (máx. 8 MB).',
  },
} as const;

const contentChildren = (Object.keys(contentHandles) as ContentSection[]).map(
  (section) => ({
    path: section,
    element: <ContentWorkspace section={section} />,
    handle: contentHandles[section],
  }),
);

const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AdminLayout />,
          children: [
            { index: true, element: <Navigate to="/inicio" replace /> },
            ...contentChildren,
            {
              path: 'mensajes',
              element: <MessagesListPage />,
              handle: {
                title: 'Mensajes',
                description: 'Consultas recibidas desde el formulario de contacto.',
              },
            },
            {
              path: 'mensajes/:id',
              element: <MessageDetailPage />,
              handle: {
                title: 'Detalle del mensaje',
                description: 'Consulta recibida desde el sitio público.',
              },
            },
            {
              element: <RequireAdmin />,
              children: [
                {
                  path: 'usuarios',
                  element: <UsersListPage />,
                  handle: {
                    title: 'Usuarios',
                    description: 'CRUD de cuentas del panel de administración.',
                  },
                },
                {
                  path: 'usuarios/nuevo',
                  element: <UserFormPage mode="create" />,
                  handle: {
                    title: 'Nuevo usuario',
                    description: 'Alta de una cuenta admin o editor.',
                  },
                },
                {
                  path: 'usuarios/:id/editar',
                  element: <UserFormPage mode="edit" />,
                  handle: {
                    title: 'Editar usuario',
                    description: 'Actualizá rol o contraseña.',
                  },
                },
                {
                  path: 'email',
                  element: <EmailConfigPage />,
                  handle: {
                    title: 'Email',
                    description: 'Configuración de notificaciones por correo (Resend).',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/inicio" replace /> },
  ],
  { basename: '/admin' },
);

export default function App() {
  return <RouterProvider router={router} />;
}
