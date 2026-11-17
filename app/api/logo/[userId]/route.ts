import { Readable } from 'node:stream';
import { userById } from '@/lib/queries';
import * as storage from '@/lib/storage';

export const runtime = 'nodejs';

// Logos sind Teil des öffentlichen Auftritts einer Galerie, daher ohne Zugangsprüfung.
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const user = userById((await params).userId);
  if (!user?.logo_key || !(await storage.stat(user.logo_key))) return new Response(null, { status: 404 });
  return new Response(Readable.toWeb(storage.stream(user.logo_key)) as ReadableStream, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=300' },
  });
}
