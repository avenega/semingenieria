import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useFlash } from '../flash';
import type { ContactMessage } from './MessagesListPage';

const STATUS_LABEL: Record<ContactMessage['status'], string> = {
  nuevo: 'Nuevo',
  leido: 'Leído',
  archivado: 'Archivado',
};

const EMAIL_LABEL: Record<ContactMessage['email_status'], string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  omitido: 'Omitido (correo no configurado)',
  error: 'Error al enviar',
};

export function MessageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setErr, setMsg } = useFlash();
  const [message, setMessage] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api<{ message: ContactMessage }>(`/api/admin/messages/${id}`);
        if (!cancelled) setMessage(data.message);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Mensaje no encontrado');
          navigate('/mensajes', { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, setErr]);

  async function setStatus(status: ContactMessage['status']) {
    if (!message) return;
    try {
      const data = await api<{ message: ContactMessage }>(`/api/admin/messages/${message.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setMessage(data.message);
      setMsg('Estado actualizado');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al actualizar');
    }
  }

  async function onDelete() {
    if (!message) return;
    if (!confirm(`¿Eliminar el mensaje de “${message.name}”?`)) return;
    try {
      await api(`/api/admin/messages/${message.id}`, { method: 'DELETE' });
      setMsg('Mensaje eliminado');
      navigate('/mensajes');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  if (loading || !message) {
    return (
      <div className="panel">
        <div className="panel-body">
          <p className="muted">Cargando mensaje…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="crumb">
            <Link to="/mensajes">Mensajes</Link>
            <span>/</span>
            <span>{message.name}</span>
          </div>
          <h3>{message.name}</h3>
          <p className="muted">
            {new Date(message.created_at).toLocaleString('es-PY')} ·{' '}
            {STATUS_LABEL[message.status]}
          </p>
        </div>
        <Link className="btn btn-ghost btn-sm" to="/mensajes">
          <i className="fa-solid fa-arrow-left" />
          Volver
        </Link>
      </div>

      <div className="panel-body message-detail">
        <div className="message-meta-grid">
          <div>
            <span className="muted">Correo</span>
            <strong>
              <a href={`mailto:${message.email}`}>{message.email}</a>
            </strong>
          </div>
          <div>
            <span className="muted">Teléfono</span>
            <strong>{message.phone || '—'}</strong>
          </div>
          <div>
            <span className="muted">Estado</span>
            <strong>{STATUS_LABEL[message.status]}</strong>
          </div>
          <div>
            <span className="muted">Envío por correo</span>
            <strong title={message.email_error || undefined}>
              {EMAIL_LABEL[message.email_status]}
            </strong>
          </div>
        </div>

        {message.email_error && (
          <div className="alert alert-error" role="status">
            <i className="fa-solid fa-circle-exclamation" />
            <span>{message.email_error}</span>
          </div>
        )}

        <div className="message-body-box">
          <h4>Mensaje</h4>
          <p>{message.message}</p>
        </div>
      </div>

      <div className="panel-foot" style={{ justifyContent: 'space-between' }}>
        <div className="row-actions" style={{ marginTop: 0 }}>
          {message.status !== 'nuevo' && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void setStatus('nuevo')}
            >
              Marcar como nuevo
            </button>
          )}
          {message.status !== 'leido' && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void setStatus('leido')}
            >
              Marcar como leído
            </button>
          )}
          {message.status !== 'archivado' && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void setStatus('archivado')}
            >
              Archivar
            </button>
          )}
        </div>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => void onDelete()}>
          <i className="fa-solid fa-trash" />
          Eliminar
        </button>
      </div>
    </div>
  );
}
