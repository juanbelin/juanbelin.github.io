import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const escapeXml = (value) => value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
function wrapTitle(title, limit) {
  const lines = [];
  for (const word of title.split(/\s+/)) {
    if (lines.length && `${lines.at(-1)} ${word}`.length <= limit) lines[lines.length - 1] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}

export async function socialImage(title, cover, categories = []) {
  let image;
  if (cover?.startsWith('/') && !cover.startsWith('//')) {
    const base = resolve('public');
    const file = resolve(base, decodeURIComponent(cover.split(/[?#]/)[0]).slice(1));
    if (!file.startsWith(base + sep)) throw new Error('Invalid social image path');
    image = await sharp(await readFile(file)).rotate().resize(450, 450, {
      fit: 'contain', background: '#080706',
    }).png().toBuffer();
  }
  const lines = wrapTitle(title, image ? 25 : 40);
  const visible = lines.slice(0, 5);
  if (lines.length > 5) visible[4] = `${visible[4]}…`;
  const fontSize = visible.length > 4 ? 43 : 49;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="#080706"/>
    <rect x="56" y="60" width="5" height="40" fill="#E5502E"/>
    <text x="80" y="88" font-family="sans-serif" font-size="25" fill="#F0EAE0">Juan Belinchón</text>
    <text x="80" y="153" font-family="sans-serif" font-size="16" fill="#E5502E">RESEARCH &amp; TECHNICAL NOTES</text>
    ${visible.map((line, index) => `<text x="80" y="${232 + index * 60}" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="#F0EAE0">${escapeXml(line)}</text>`).join('')}
    <text x="80" y="570" font-family="sans-serif" font-size="18" fill="#9A9188">${escapeXml(categories.join(' / ').slice(0, 65))}</text>
    <text x="1120" y="570" text-anchor="end" font-family="sans-serif" font-size="16" fill="#9A9188">juanbelin.github.io</text>
  </svg>`;
  return sharp(Buffer.from(svg)).composite(image ? [{ input: image, left: 700, top: 80 }] : [])
    .jpeg({ quality: 86 }).toBuffer();
}
