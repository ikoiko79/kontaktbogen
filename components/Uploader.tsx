'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = { key: string; name: string; progress: number; error?: string; done?: boolean };

function send(galleryId: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/galleries/${galleryId}/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let message = `Fehler ${xhr.status}`;
      try {
        message = JSON.parse(xhr.responseText).error || message;
      } catch {}
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error('Verbindung unterbrochen'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

export function Uploader({ galleryId }: { galleryId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  async function upload(list: FileList | File[]) {
    const files = Array.from(list);
    if (!files.length) return;
    const batch = files.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, progress: 0 }));
    setItems((prev) => [...prev.filter((p) => p.error), ...batch]);
    setBusy(true);
    const patch = (key: string, change: Partial<Item>) =>
      setItems((prev) => prev.map((p) => (p.key === key ? { ...p, ...change } : p)));
    let next = 0;
    const worker = async () => {
      while (next < files.length) {
        const i = next++;
        try {
          await send(galleryId, files[i], (p) => patch(batch[i].key, { progress: p }));
          patch(batch[i].key, { progress: 1, done: true });
        } catch (e) {
          patch(batch[i].key, { error: (e as Error).message });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    setBusy(false);
    setItems((prev) => prev.filter((p) => !p.done));
    router.refresh();
  }

  return (
    <div
      className={`drop${over ? ' over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void upload(e.dataTransfer.files);
      }}
    >
      <p>Fotos und Videos hierher ziehen</p>
      <button className="btn" type="button" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Lädt hoch …' : 'Dateien auswählen'}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept="image/jpeg,image/png,image/webp,image/tiff,image/avif,image/gif,video/mp4,video/quicktime,video/webm"
        onChange={(e) => {
          if (e.target.files) void upload(e.target.files);
          e.target.value = '';
        }}
      />
      <p className="mono muted" style={{ margin: '12px 0 0' }}>JPG, PNG, WebP, TIFF, AVIF, GIF · MP4, MOV, WebM</p>
      {items.length > 0 && (
        <ul className="uploads" aria-live="polite">
          {items.map((it) => (
            <li key={it.key}>
              <span>{it.name}</span>
              {it.error ? <span className="bad">{it.error}</span> : <span className="mono">{Math.round(it.progress * 100)} %</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
