import sharp from 'sharp';

export const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif', '.gif']);
export const VIDEO_EXT = new Set(['.mp4', '.mov', '.webm', '.m4v']);

export const VIDEO_MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

export async function makeVariants(input: Buffer) {
  const base = sharp(input, { failOn: 'none' }).rotate();
  const m = await sharp(input, { failOn: 'none' }).metadata();
  const swap = (m.orientation ?? 1) >= 5;
  const width = (swap ? m.height : m.width) ?? 0;
  const height = (swap ? m.width : m.height) ?? 0;
  const thumb = await base.clone().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const preview = await base.clone().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  return { width, height, thumb, preview };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Legt den Studionamen gekachelt und schräg über die Vorschau.
export async function watermark(preview: Buffer, text: string): Promise<Buffer> {
  const img = sharp(preview);
  const { width = 1600, height = 1200 } = await img.metadata();
  const size = Math.max(18, Math.round(Math.min(width, height) / 22));
  const stepX = Math.max(size * 6, text.length * size * 0.75 + size * 3);
  const stepY = size * 5;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="p" width="${stepX}" height="${stepY}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
      <text x="0" y="${size}" font-family="Inter, 'DejaVu Sans', Helvetica, Arial, sans-serif" font-size="${size}" font-weight="600"
        fill="#fff" fill-opacity="0.34" stroke="#000" stroke-opacity="0.16" stroke-width="${Math.max(1, size / 28)}">${esc(text)}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p)"/>
</svg>`;
  return img.composite([{ input: Buffer.from(svg) }]).webp({ quality: 84 }).toBuffer();
}
