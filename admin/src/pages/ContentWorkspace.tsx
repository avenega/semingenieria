import { useEffect } from 'react';
import { IconPicker } from '../IconPicker';
import { api, type ProjectItem } from '../api';
import { useFlash } from '../flash';
import {
  galleryKey,
  mediaKey,
  useSite,
} from '../site';

export type ContentSection =
  | 'inicio'
  | 'servicios'
  | 'obras'
  | 'fotos'
  | 'contacto'
  | 'medios';

function SettingsEditor({
  settings,
  keys,
  onChange,
}: {
  settings: Record<string, string>;
  keys: Array<{ key: string; label: string; rows?: number }>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <>
      {keys.map((k) => (
        <div className="field" key={k.key}>
          <label htmlFor={k.key}>{k.label}</label>
          {k.rows ? (
            <textarea
              id={k.key}
              rows={k.rows}
              value={settings[k.key] || ''}
              onChange={(e) => onChange(k.key, e.target.value)}
            />
          ) : (
            <input
              id={k.key}
              value={settings[k.key] || ''}
              onChange={(e) => onChange(k.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </>
  );
}

export function ContentWorkspace({ section }: { section: ContentSection }) {
  const { setMsg, setErr } = useFlash();
  const {
    site,
    setSite,
    media,
    uploadingId,
    load,
    loadMedia,
    saveSettings,
    onUploadGalleryImage,
    onUploadProjectImage,
  } = useSite();

  useEffect(() => {
    if (section === 'medios' || section === 'fotos' || section === 'obras') {
      loadMedia().catch((e) => setErr(e instanceof Error ? e.message : 'Error'));
    }
  }, [section, loadMedia, setErr]);

  if (!site) {
    return (
      <div className="loading-screen" style={{ minHeight: 240 }}>
        <div className="loading-spinner" />
        <p className="muted">Cargando contenido…</p>
      </div>
    );
  }

  function renderProjectEditor(
    kind: 'curso' | 'entregadas',
    list: ProjectItem[],
    labels: { title: string; subtitle: string },
  ) {
    return list.map((p, idx) => (
      <div className="item-card" key={p.id}>
        <div className="gallery-edit">
          <div className="gallery-preview">
            {p.image_url ? (
              <img src={p.image_url} alt={p.title} />
            ) : (
              <div className="gallery-preview-empty">
                <i className="fa-solid fa-image" />
                Sin imagen
              </div>
            )}
          </div>
          <div className="gallery-fields">
            <div className="grid-2">
              <div className="field">
                <label>{labels.title}</label>
                <input
                  value={p.title}
                  onChange={(e) => {
                    const next = [...list];
                    next[idx] = { ...p, title: e.target.value };
                    setSite({
                      ...site!,
                      projects: { ...site!.projects, [kind]: next },
                    });
                  }}
                />
              </div>
              <div className="field">
                <label>{labels.subtitle}</label>
                <input
                  value={p.subtitle}
                  onChange={(e) => {
                    const next = [...list];
                    next[idx] = { ...p, subtitle: e.target.value };
                    setSite({
                      ...site!,
                      projects: { ...site!.projects, [kind]: next },
                    });
                  }}
                />
              </div>
            </div>
            <IconPicker
              label="Icono (si no hay imagen)"
              value={p.icon}
              onChange={(icon) => {
                const next = [...list];
                next[idx] = { ...p, icon };
                setSite({
                  ...site!,
                  projects: { ...site!.projects, [kind]: next },
                });
              }}
            />
            <div className="row-actions">
              <label className="btn btn-ghost btn-sm upload-btn">
                <i className="fa-solid fa-upload" />
                {uploadingId === p.id ? 'Subiendo…' : 'Subir imagen'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  disabled={uploadingId === p.id}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void onUploadProjectImage(kind, idx, file);
                  }}
                />
              </label>
              {p.image_url && (
                <button
                  className="btn btn-danger btn-sm"
                  type="button"
                  onClick={() => {
                    const next = [...list];
                    next[idx] = { ...p, image_key: null, image_url: null };
                    setSite({
                      ...site!,
                      projects: { ...site!.projects, [kind]: next },
                    });
                  }}
                >
                  Quitar imagen
                </button>
              )}
            </div>
            {media.length > 0 && (
              <div className="field">
                <label>O elegir de la biblioteca</label>
                <select
                  value={mediaKey(p) || ''}
                  onChange={(e) => {
                    const key = e.target.value || null;
                    const found = media.find((m) => m.object_key === key);
                    const next = [...list];
                    next[idx] = {
                      ...p,
                      image_key: key,
                      image_url: found?.url || null,
                    };
                    setSite({
                      ...site!,
                      projects: { ...site!.projects, [kind]: next },
                    });
                  }}
                >
                  <option value="">— Sin seleccionar —</option>
                  {media.map((m) => (
                    <option key={m.id} value={m.object_key}>
                      {m.filename}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    ));
  }


  return (
    <>
        {section === 'inicio' && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3>Contenido principal</h3>
                <p className="muted">Textos de portada y sección institucional.</p>
              </div>
            </div>
            <div className="panel-body">
            <SettingsEditor
              settings={site.settings}
              onChange={(k, v) =>
                setSite({ ...site, settings: { ...site.settings, [k]: v } })
              }
              keys={[
                { key: 'site_name', label: 'Nombre del sitio' },
                { key: 'hero_tagline', label: 'Subtítulo del hero' },
                { key: 'about_p1', label: 'Sobre nosotros (párrafo 1)', rows: 4 },
                { key: 'about_p2', label: 'Sobre nosotros (párrafo 2)', rows: 3 },
                { key: 'vision', label: 'Visión', rows: 3 },
                { key: 'mission', label: 'Misión', rows: 3 },
                { key: 'commitment', label: 'Compromiso', rows: 3 },
                { key: 'pillar_1_title', label: 'Pilar 1 — título' },
                { key: 'pillar_1_text', label: 'Pilar 1 — texto', rows: 2 },
                { key: 'pillar_2_title', label: 'Pilar 2 — título' },
                { key: 'pillar_2_text', label: 'Pilar 2 — texto', rows: 2 },
                { key: 'pillar_3_title', label: 'Pilar 3 — título' },
                { key: 'pillar_3_text', label: 'Pilar 3 — texto', rows: 2 },
              ]}
            />
            <div className="grid-2">
              <IconPicker
                label="Pilar 1 — icono"
                value={site.settings.pillar_1_icon || 'fa-bolt'}
                onChange={(icon) =>
                  setSite({ ...site, settings: { ...site.settings, pillar_1_icon: icon } })
                }
              />
              <IconPicker
                label="Pilar 2 — icono"
                value={site.settings.pillar_2_icon || 'fa-fire-extinguisher'}
                onChange={(icon) =>
                  setSite({ ...site, settings: { ...site.settings, pillar_2_icon: icon } })
                }
              />
            </div>
            <IconPicker
              label="Pilar 3 — icono"
              value={site.settings.pillar_3_icon || 'fa-gears'}
              onChange={(icon) =>
                setSite({ ...site, settings: { ...site.settings, pillar_3_icon: icon } })
              }
            />
            </div>
            <div className="panel-foot">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => saveSettings().catch((e) => setErr(e.message))}
              >
                <i className="fa-solid fa-floppy-disk" />
                Guardar inicio
              </button>
            </div>
          </div>
        )}

        {section === 'servicios' && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3>Servicios publicados</h3>
                <p className="muted">Cada tarjeta aparece en la página de servicios.</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() =>
                  setSite({
                    ...site,
                    services: [
                      ...site.services,
                      {
                        id: crypto.randomUUID(),
                        title: 'Nuevo servicio',
                        icon: 'fa-plug',
                        items: ['Ítem'],
                        highlight: false,
                        sort_order: site.services.length + 1,
                      },
                    ],
                  })
                }
              >
                <i className="fa-solid fa-plus" />
                Agregar
              </button>
            </div>
            <div className="panel-body">
            {site.services.map((s, idx) => (
              <div className="item-card" key={s.id}>
                <div className="grid-2">
                  <div className="field">
                    <label>Título</label>
                    <input
                      value={s.title}
                      onChange={(e) => {
                        const services = [...site.services];
                        services[idx] = { ...s, title: e.target.value };
                        setSite({ ...site, services });
                      }}
                    />
                  </div>
                  <IconPicker
                    label="Icono"
                    value={s.icon}
                    onChange={(icon) => {
                      const services = [...site.services];
                      services[idx] = { ...s, icon };
                      setSite({ ...site, services });
                    }}
                  />
                </div>
                <div className="field">
                  <label>Ítems (uno por línea)</label>
                  <textarea
                    value={s.items.join('\n')}
                    onChange={(e) => {
                      const services = [...site.services];
                      services[idx] = {
                        ...s,
                        items: e.target.value
                          .split('\n')
                          .map((x) => x.trim())
                          .filter(Boolean),
                      };
                      setSite({ ...site, services });
                    }}
                  />
                </div>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={s.highlight}
                    onChange={(e) => {
                      const services = [...site.services];
                      services[idx] = { ...s, highlight: e.target.checked };
                      setSite({ ...site, services });
                    }}
                  />
                  Destacar (contra incendios)
                </label>
                <div className="row-actions">
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={() =>
                      setSite({
                        ...site,
                        services: site.services.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <i className="fa-solid fa-trash" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
            </div>
            <div className="panel-foot">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() =>
                  api('/api/admin/services', {
                    method: 'PUT',
                    body: JSON.stringify(site.services),
                  })
                    .then(() => setMsg('Servicios guardados'))
                    .catch((e) => setErr(e.message))
                }
              >
                <i className="fa-solid fa-floppy-disk" />
                Guardar servicios
              </button>
            </div>
          </div>
        )}

        {section === 'obras' && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3>Obras en curso y entregadas</h3>
                <p className="muted">Subí una imagen por obra; se guarda en R2.</p>
              </div>
            </div>
            <div className="panel-body">
            <div className="field">
              <label>Introducción (obras en curso)</label>
              <textarea
                value={site.settings.curso_intro || ''}
                onChange={(e) =>
                  setSite({
                    ...site,
                    settings: { ...site.settings, curso_intro: e.target.value },
                  })
                }
              />
            </div>
            <h4 style={{ margin: '8px 0 12px', fontWeight: 600 }}>En ejecución</h4>
            {renderProjectEditor('curso', site.projects.curso, {
              title: 'Título',
              subtitle: 'Subtítulo / fase',
            })}

            <h4 style={{ margin: '20px 0 12px', fontWeight: 600 }}>Entregadas</h4>
            {renderProjectEditor('entregadas', site.projects.entregadas, {
              title: 'Cliente / obra',
              subtitle: 'Sector',
            })}
            </div>
            <div className="panel-foot">
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  try {
                    await saveSettings(['curso_intro']);
                    await api('/api/admin/projects', {
                      method: 'PUT',
                      body: JSON.stringify({
                        curso: site.projects.curso.map((p, i) => ({
                          ...p,
                          image_key: mediaKey(p),
                          sort_order: i + 1,
                        })),
                        entregadas: site.projects.entregadas.map((p, i) => ({
                          ...p,
                          image_key: mediaKey(p),
                          sort_order: i + 1,
                        })),
                      }),
                    });
                    setMsg('Obras guardadas');
                    await load();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : 'Error');
                  }
                }}
              >
                <i className="fa-solid fa-floppy-disk" />
                Guardar obras
              </button>
            </div>
          </div>
        )}

        {section === 'fotos' && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3>Galería de obras</h3>
                <p className="muted">Las imágenes se publican al guardar la galería.</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() =>
                  setSite({
                    ...site,
                    gallery: [
                      ...site.gallery,
                      {
                        id: crypto.randomUUID(),
                        title: 'Nueva foto',
                        icon: 'fa-image',
                        image_key: null,
                        image_url: null,
                        sort_order: site.gallery.length + 1,
                      },
                    ],
                  })
                }
              >
                <i className="fa-solid fa-plus" />
                Agregar foto
              </button>
            </div>
            <div className="panel-body">
            <div className="field">
              <label>Introducción</label>
              <textarea
                value={site.settings.fotos_intro || ''}
                onChange={(e) =>
                  setSite({
                    ...site,
                    settings: { ...site.settings, fotos_intro: e.target.value },
                  })
                }
              />
            </div>
            {site.gallery.map((g, idx) => (
              <div className="item-card" key={g.id}>
                <div className="gallery-edit">
                  <div className="gallery-preview">
                    {g.image_url ? (
                      <img src={g.image_url} alt={g.title} />
                    ) : (
                      <div className="gallery-preview-empty">
                        <i className="fa-solid fa-image" />
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="gallery-fields">
                    <div className="field">
                      <label>Título</label>
                      <input
                        value={g.title}
                        onChange={(e) => {
                          const gallery = [...site.gallery];
                          gallery[idx] = { ...g, title: e.target.value };
                          setSite({ ...site, gallery });
                        }}
                      />
                    </div>
                    <IconPicker
                      label="Icono de respaldo"
                      value={g.icon}
                      onChange={(icon) => {
                        const gallery = [...site.gallery];
                        gallery[idx] = { ...g, icon };
                        setSite({ ...site, gallery });
                      }}
                    />
                    <div className="row-actions">
                      <label className="btn btn-ghost btn-sm upload-btn">
                        <i className="fa-solid fa-upload" />
                        {uploadingId === g.id ? 'Subiendo…' : 'Subir imagen'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          hidden
                          disabled={uploadingId === g.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void onUploadGalleryImage(idx, file);
                          }}
                        />
                      </label>
                      {g.image_url && (
                        <button
                          className="btn btn-danger btn-sm"
                          type="button"
                          onClick={() => {
                            const gallery = [...site.gallery];
                            gallery[idx] = { ...g, image_key: null, image_url: null };
                            setSite({ ...site, gallery });
                          }}
                        >
                          Quitar imagen
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        type="button"
                        onClick={() =>
                          setSite({
                            ...site,
                            gallery: site.gallery.filter((_, i) => i !== idx),
                          })
                        }
                      >
                        Eliminar ítem
                      </button>
                    </div>
                    {media.length > 0 && (
                      <div className="field">
                        <label>O elegir de la biblioteca</label>
                        <select
                          value={galleryKey(g) || ''}
                          onChange={(e) => {
                            const key = e.target.value || null;
                            const found = media.find((m) => m.object_key === key);
                            const gallery = [...site.gallery];
                            gallery[idx] = {
                              ...g,
                              image_key: key,
                              image_url: found?.url || null,
                            };
                            setSite({ ...site, gallery });
                          }}
                        >
                          <option value="">— Sin seleccionar —</option>
                          {media.map((m) => (
                            <option key={m.id} value={m.object_key}>
                              {m.filename}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
            <div className="panel-foot">
              <button
                className="btn btn-primary"
                type="button"
                onClick={async () => {
                  try {
                    await saveSettings(['fotos_intro']);
                    await api('/api/admin/gallery', {
                      method: 'PUT',
                      body: JSON.stringify(
                        site.gallery.map((g, i) => ({
                          id: g.id,
                          title: g.title,
                          icon: g.icon,
                          image_key: galleryKey(g),
                          sort_order: i + 1,
                        })),
                      ),
                    });
                    setMsg('Galería guardada');
                    await load();
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : 'Error');
                  }
                }}
              >
                <i className="fa-solid fa-floppy-disk" />
                Guardar galería
              </button>
            </div>
          </div>
        )}

        {section === 'contacto' && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3>Datos de contacto</h3>
                <p className="muted">Información visible en la página de contacto.</p>
              </div>
            </div>
            <div className="panel-body">
            <SettingsEditor
              settings={site.settings}
              onChange={(k, v) =>
                setSite({ ...site, settings: { ...site.settings, [k]: v } })
              }
              keys={[
                { key: 'contact_phone', label: 'Teléfono' },
                { key: 'contact_email', label: 'Correo' },
                { key: 'contact_whatsapp', label: 'WhatsApp (código país, ej. 595976129559)' },
                { key: 'contact_hours_week', label: 'Horario semana' },
                { key: 'contact_hours_sat', label: 'Horario sábado' },
                { key: 'coverage_text', label: 'Texto de cobertura', rows: 3 },
              ]}
            />
            </div>
            <div className="panel-foot">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() =>
                  saveSettings([
                    'contact_phone',
                    'contact_email',
                    'contact_whatsapp',
                    'contact_hours_week',
                    'contact_hours_sat',
                    'coverage_text',
                  ]).catch((e) => setErr(e.message))
                }
              >
                <i className="fa-solid fa-floppy-disk" />
                Guardar contacto
              </button>
            </div>
          </div>
        )}

        {section === 'medios' && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <h3>Biblioteca de medios</h3>
                <p className="muted">JPG, PNG, WebP o GIF · máximo 8 MB.</p>
              </div>
              <label className="btn btn-primary btn-sm upload-btn">
                <i className="fa-solid fa-cloud-arrow-up" />
                Subir imagen
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    try {
                      await uploadMedia(file);
                      setMsg(`Subido: ${file.name}`);
                      await loadMedia();
                    } catch (error) {
                      setErr(error instanceof Error ? error.message : 'Error');
                    }
                  }}
                />
              </label>
            </div>
            <div className="panel-body">
            <div className="media-grid">
              {media.map((m) => (
                <div className="media-card" key={m.id}>
                  <img src={m.url} alt={m.filename} />
                  <div className="media-meta">
                    <strong>{m.filename}</strong>
                    <div className="muted">{m.object_key}</div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    type="button"
                    onClick={async () => {
                      try {
                        await api(`/api/admin/media/${m.id}`, { method: 'DELETE' });
                        setMsg('Archivo eliminado');
                        await loadMedia();
                      } catch (error) {
                        setErr(error instanceof Error ? error.message : 'Error');
                      }
                    }}
                  >
                    <i className="fa-solid fa-trash" />
                    Eliminar
                  </button>
                </div>
              ))}
              {media.length === 0 && (
                <p className="muted">Todavía no hay archivos en la biblioteca.</p>
              )}
            </div>
            </div>
          </div>
        )}

    </>
  );
}
