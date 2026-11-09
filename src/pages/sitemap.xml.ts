import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { RESEARCH_PAGE_SIZE } from '@/lib/research-pagination.mjs';

const escapeXml = (value: string) => value.replace(/[<>&"']/g, character => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
})[character]!);

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error('The sitemap requires a configured site URL.');
  const [research, projects, cheatsheets] = await Promise.all([
    getCollection('research', ({ data }) => !data.draft),
    getCollection('projects', ({ data }) => !data.draft),
    getCollection('cheatsheets', ({ data }) => !data.draft),
  ]);
  const paths = [
    '/', '/profile/', '/experience/', '/certs/', '/contact/',
    '/research/', '/projects/', '/cheatsheets/', '/reports/',
    ...research.map(entry => `/research/${entry.id}/`),
    ...projects.map(entry => `/projects/${entry.id}/`),
    ...cheatsheets.map(entry => `/cheatsheets/${entry.id}/`),
    ...Array.from({ length: Math.max(0, Math.ceil(research.length / RESEARCH_PAGE_SIZE) - 1) },
      (_, index) => `/research/page/${index + 2}/`),
  ];
  const urls = [...new Set(paths)].map(path => `  <url><loc>${escapeXml(new URL(path, site).href)}</loc></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
