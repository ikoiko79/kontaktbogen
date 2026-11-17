// Dateiablage. Aktuell lokale Platte unter DATA_DIR/files.
// Für S3 genügt es, diese Funktionen auszutauschen: Schlüssel sind bereits
// objektspeicher-tauglich (g/<galerie>/<datei>/<variante>).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { DATA_DIR } from './db';

const ROOT = path.join(DATA_DIR, 'files');

export function keyPath(key: string): string {
  const p = path.resolve(ROOT, key);
  if (!p.startsWith(path.resolve(ROOT) + path.sep)) throw new Error('bad key');
  return p;
}

export async function put(key: string, data: Buffer): Promise<void> {
  const p = keyPath(key);
  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.writeFile(p, data);
}

export async function get(key: string): Promise<Buffer> {
  return fsp.readFile(keyPath(key));
}

export async function stat(key: string): Promise<fs.Stats | null> {
  try {
    return await fsp.stat(keyPath(key));
  } catch {
    return null;
  }
}

export function stream(key: string, range?: { start: number; end: number }) {
  return fs.createReadStream(keyPath(key), range);
}

export async function removePrefix(prefix: string): Promise<void> {
  await fsp.rm(keyPath(prefix), { recursive: true, force: true });
}

export const fileKey = (galleryId: string, fileId: string, variant: string) =>
  `g/${galleryId}/${fileId}/${variant}`;
