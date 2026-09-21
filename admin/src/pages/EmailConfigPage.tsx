import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { PasswordField } from '../components/PasswordField';
import { useFlash } from '../flash';

type EmailConfigResponse = {
  enabled: boolean;
  to: string;
  from: string;
  apiKeyConfigured: boolean;
  apiKeyFromEnv: boolean;
  apiKeyMasked: string;
};

export function EmailConfigPage() {
  const { user } = useAuth();
  const { setMsg, setErr } = useFlash();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [to, setTo] = useState('');
  const [from, setFrom] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [meta, setMeta] = useState({
    apiKeyConfigured: false,
    apiKeyFromEnv: false,
    apiKeyMasked: '',
  });

  async function load() {
    setLoading(true);
    try {
      const data = await api<EmailConfigResponse>('/api/admin/email-config');
      setEnabled(data.enabled);
      setTo(data.to || '');
      setFrom(data.from || '');
      setApiKey('');
      setClearApiKey(false);
      setMeta({
        apiKeyConfigured: data.apiKeyConfigured,
        apiKeyFromEnv: data.apiKeyFromEnv,
        apiKeyMasked: data.apiKeyMasked || '',
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') void load();
  }, [user?.role]);

  if (user?.role !== 'admin') return <Navigate to="/inicio" replace />;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const data = await api<EmailConfigResponse & { ok: boolean }>('/api/admin/email-config', {
        method: 'PUT',
        body: JSON.stringify({
          enabled,
          to,
          from,
          apiKey: clearApiKey ? undefined : apiKey || undefined,
          clearApiKey,
        }),
      });
      setApiKey('');
      setClearApiKey(false);
      setMeta({
        apiKeyConfigured: data.apiKeyConfigured,
        apiKeyFromEnv: data.apiKeyFromEnv,
        apiKeyMasked: data.apiKeyMasked || '',
      });
      setMsg('Configuración de email guardada');
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setTesting(true);
    try {
      const data = await api<{ ok: boolean; message?: string }>('/api/admin/email-config/test', {
        method: 'POST',
      });
      setMsg(data.message || 'Correo de prueba enviado');
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'No se pudo enviar la prueba');
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-body">
          <p className="muted">Cargando configuración…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>Configuración de email</h3>
          <p className="muted">
            Notificaciones de consultas del formulario de contacto (proveedor Resend).
          </p>
        </div>
        <span
          className={`badge ${meta.apiKeyConfigured && to ? 'badge-admin' : 'badge-editor'}`}
        >
          {enabled && meta.apiKeyConfigured && to ? 'Listo para enviar' : 'Incompleto'}
        </span>
      </div>

      <form onSubmit={onSave}>
        <div className="panel-body">
          <label className="check-row" style={{ marginBottom: 18 }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Activar envío de correos al recibir un mensaje
          </label>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="email-to">Correo destino</label>
              <input
                id="email-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="info@semingenieria.com.py"
                autoComplete="off"
              />
              <span className="field-hint">Ahí llegan las consultas del sitio.</span>
            </div>
            <div className="field">
              <label htmlFor="email-from">Correo remitente</label>
              <input
                id="email-from"
                type="email"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="noreply@tudominio.com"
                autoComplete="off"
              />
              <span className="field-hint">
                Debe ser un dominio verificado en Resend (o onboarding@resend.dev en pruebas).
              </span>
            </div>
          </div>

          <PasswordField
            id="email-api-key"
            label="API key de Resend"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setClearApiKey(false);
            }}
            autoComplete="off"
            placeholder={
              meta.apiKeyConfigured
                ? `Guardada (${meta.apiKeyMasked}) — escribí una nueva para reemplazar`
                : 're_xxxxxxxx'
            }
          />

          {meta.apiKeyConfigured && (
            <label className="check-row" style={{ marginBottom: 14 }}>
              <input
                type="checkbox"
                checked={clearApiKey}
                onChange={(e) => {
                  setClearApiKey(e.target.checked);
                  if (e.target.checked) setApiKey('');
                }}
              />
              Eliminar API key guardada en el CMS
              {meta.apiKeyFromEnv ? ' (seguirá valiendo la del secreto de Cloudflare)' : ''}
            </label>
          )}

          <div className="alert alert-ok" role="note" style={{ marginTop: 8 }}>
            <i className="fa-solid fa-circle-info" />
            <span>
              Creá una API key en{' '}
              <a href="https://resend.com" target="_blank" rel="noreferrer">
                resend.com
              </a>
              . También podés definir <code>RESEND_API_KEY</code> como secreto de Wrangler.
            </span>
          </div>
        </div>

        <div className="panel-foot" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={testing || !to || !meta.apiKeyConfigured}
            onClick={() => void onTest()}
          >
            {testing ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" /> Enviando prueba…
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane" /> Enviar correo de prueba
              </>
            )}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin" /> Guardando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk" /> Guardar configuración
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
