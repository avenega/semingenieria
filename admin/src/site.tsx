/**
 * Temporary transform helper — run once to extract content workspace.
 * Not used at runtime.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, uploadMedia, type GalleryItem, type ProjectItem, type SitePayload } from './api';
import { useFlash } from './flash';

type SiteCtx = {
  site: SitePayload | null;
  setSite: React.Dispatch<React.SetStateAction<SitePayload | null>>;
  media: Array<{ id: string; filename: string; url: string; object_key: string }>;
  uploadingId: string | null;
  load: () => Promise<void>;
  loadMedia: () => Promise<void>;
  saveSettings: (subset?: string[]) => Promise<void>;
  onUploadGalleryImage: (idx: number, file: File) => Promise<void>;
  onUploadProjectImage: (kind: 'curso' | 'entregadas', idx: number, file: File) => Promise<void>;
};

const SiteContext = createContext<SiteCtx | null>(null);

export function mediaKey(item: { image_key?: string | null; image_url?: string | null }): string | null {
  if (item.image_key) return item.image_key;
  if (item.image_url?.startsWith('/api/public/media/')) {
    return decodeURIComponent(item.image_url.replace(/^\/api\/public\/media\//, ''));
  }
  return null;
}

export function galleryKey(g: GalleryItem): string | null {
  return mediaKey(g);
}

export function SiteProvider({ children }: { children: ReactNode }) {
  const { setMsg, setErr } = useFlash();
  const [site, setSite] = useState<SitePayload | null>(null);
  const [media, setMedia] = useState<SiteCtx['media']>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api<SitePayload>('/api/admin/site');
    setSite(data);
  }, []);

  const loadMedia = useCallback(async () => {
    const data = await api<{ items: SiteCtx['media'] }>('/api/admin/media');
    setMedia(data.items || []);
  }, []);

  useEffect(() => {
    load().catch((e) => setErr(e instanceof Error ? e.message : 'Error al cargar'));
  }, [load, setErr]);

  const saveSettings = useCallback(
    async (subset?: string[]) => {
      if (!site) return;
      const body = subset
        ? Object.fromEntries(subset.map((k) => [k, site.settings[k] || '']))
        : site.settings;
      await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(body) });
      setMsg('Guardado correctamente');
    },
    [site, setMsg],
  );

  const onUploadGalleryImage = useCallback(
    async (idx: number, file: File) => {
      if (!site) return;
      setUploadingId(site.gallery[idx].id);
      try {
        const uploaded = await uploadMedia(file);
        const gallery = [...site.gallery];
        gallery[idx] = {
          ...gallery[idx],
          image_key: uploaded.object_key,
          image_url: uploaded.url,
        };
        setSite({ ...site, gallery });
        setMsg(`Imagen subida: ${file.name}`);
        await loadMedia();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error al subir');
      } finally {
        setUploadingId(null);
      }
    },
    [site, setMsg, setErr, loadMedia],
  );

  const onUploadProjectImage = useCallback(
    async (kind: 'curso' | 'entregadas', idx: number, file: File) => {
      if (!site) return;
      const list = site.projects[kind];
      setUploadingId(list[idx].id);
      try {
        const uploaded = await uploadMedia(file);
        const next = [...list];
        next[idx] = {
          ...next[idx],
          image_key: uploaded.object_key,
          image_url: uploaded.url,
        };
        setSite({ ...site, projects: { ...site.projects, [kind]: next } });
        setMsg(`Imagen subida: ${file.name}`);
        await loadMedia();
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error al subir');
      } finally {
        setUploadingId(null);
      }
    },
    [site, setMsg, setErr, loadMedia],
  );

  const value = useMemo(
    () => ({
      site,
      setSite,
      media,
      uploadingId,
      load,
      loadMedia,
      saveSettings,
      onUploadGalleryImage,
      onUploadProjectImage,
    }),
    [
      site,
      media,
      uploadingId,
      load,
      loadMedia,
      saveSettings,
      onUploadGalleryImage,
      onUploadProjectImage,
    ],
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite fuera de SiteProvider');
  return ctx;
}

export type { ProjectItem, GalleryItem, SitePayload };
