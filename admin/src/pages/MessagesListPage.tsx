import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useFlash } from '../flash';

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: 'nuevo' | 'leido' | 'archivado';
  email_status: 'pendiente' | 'enviado' | 'omitido' | 'error';
  email_error: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_LABEL: Record<ContactMessage['status'], string> = {
  nuevo: 'Nuevo',
  leido: 'Leído',
  archivado: 'Archivado',
};

const EMAIL_LABEL: Record<ContactMessage['email_status'], string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  omitido: 'Omitido',
  error: 'Error',
};

export function MessagesListPage() {
  const { setErr, setMsg } = useFlash();
  const [items, setItems] = useState<ContactMessage[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);

  async function load(status = filter) {
    setLoading(true);
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await api<{ items: ContactMessage[]; unread: number }>(
        `/api/admin/messages${q}`,
      );
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [filter]);

  async function onDelete(m: ContactMessage) {
    if (!confirm(`¿Eliminar el mensaje de “${m.name}”?`)) return;
    try {
      await api(`/api/admin/messages/${m.id}`, { method: 'DELETE' });
      setMsg('Mensaje eliminado');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Mensajes de contacto</h3>
          <p className="muted">
            Consultas enviadas desde el sitio.
            {unread > 0 ? ` ${unread} sin leer.` : ''}
          </p>
        </div>
        <div className="filter-tabs">
          {[
            ['', 'Todos'],
            ['nuevo', 'Nuevos'],
            ['leido', 'Leídos'],
            ['archivado', 'Archivados'],
          ].map(([value, label]) => (
            <button
              key={value || 'all'}
              type="button"
              className={`btn btn-sm ${filter === value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-body">
        {loading ? (
          <p className="muted">Cargando mensajes…</p>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-inbox" />
            <p>No hay mensajes en esta bandeja.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Remitente</th>
                  <th>Mensaje</th>
                  <th>Estado</th>
                  <th>Correo</th>
                  <th className="col-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className={m.status === 'nuevo' ? 'is-unread' : undefined}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(m.created_at).toLocaleString('es-PY')}
                    </td>
                    <td>
                      <strong>{m.name}</strong>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>
                        {m.email}
                        {m.phone ? ` · ${m.phone}` : ''}
                      </div>
                    </td>
                    <td>
                      <span className="msg-preview">
                        {m.message.length > 90 ? `${m.message.slice(0, 90)}…` : m.message}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.status === 'nuevo'
                            ? 'badge-admin'
                            : m.status === 'archivado'
                              ? 'badge-editor'
                              : 'badge-editor'
                        }`}
                      >
                        {STATUS_LABEL[m.status]}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.email_status === 'enviado'
                            ? 'badge-admin'
                            : m.email_status === 'error'
                              ? 'badge-danger'
                              : 'badge-editor'
                        }`}
                        title={m.email_error || undefined}
                      >
                        {EMAIL_LABEL[m.email_status]}
                      </span>
                    </td>
                    <td className="col-actions">
                      <div className="table-actions">
                        <Link className="btn btn-ghost btn-sm" to={`/mensajes/${m.id}`}>
                          <i className="fa-solid fa-eye" />
                          Ver
                        </Link>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => void onDelete(m)}
                        >
                          <i className="fa-solid fa-trash" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
