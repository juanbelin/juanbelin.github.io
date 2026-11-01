// One-time import of the original blog. Source files are never modified.
// Run from the portfolio root: node scripts/migrate-jekyll.mjs ../juanbelin.github.io
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

const source = path.resolve(process.argv[2] ?? '../juanbelin.github.io');
const destination = path.resolve('src/content/research');
const processor = unified().use(remarkParse).use(remarkGfm);
const assets = new Map();
const report = { posts: [], missingAssets: [], normalizedAssets: [], conversions: [] };
fs.mkdirSync(destination, { recursive: true });

function asset(url) {
  if (!url.startsWith('/assets/')) return;
  const relative = url.split(/[?#]/)[0];
  const decoded = decodeURIComponent(relative);
  const candidates = [decoded, relative];
  const actual = candidates.find(candidate => fs.existsSync(path.join(source, candidate)));
  if (!actual) { report.missingAssets.push(url); return; }
  // Normalize literal %20 filenames into real spaces, so browser URL decoding works.
  const target = path.join('public', decoded);
  assets.set(target, path.join(source, actual));
  if (actual !== decoded) report.normalizedAssets.push({ source: actual, target: decoded });
}

for (const filename of fs.readdirSync(path.join(source, '_posts')).filter(file => file.endsWith('.md')).sort()) {
  const text = fs.readFileSync(path.join(source, '_posts', filename), 'utf8');
  const match = text.match(/^\s*---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!match) throw new Error(`Missing frontmatter: ${filename}`);
  // Jekyll accepts duplicate keys; retain the last description, as on the old site.
  const original = yaml.load(match[1], { json: true });
  const [, year, month, day, originalSlug] = filename.match(/^(\d{4})-(\d{1,2})-(\d{1,2})-(.+)\.md$/);
  const slug = originalSlug.toLowerCase().replaceAll('_', '-').replace(/-+$/g, '');
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const categories = original.categories ?? [];
  const tags = original.tags ?? [];
  let body = text.slice(match[0].length);
  body = body.replace(/{%\s*(?:endraw|raw)\s*%}/g, '')
    .replace(/^\s*\{:\s*\.prompt-[\w-]+\s*\}\s*$/gm, '')
    .replace(/!\[\[([^\]]+)\]\]/g, '![]($1)')
    .replace(/{%\s*include embed\/youtube\.html id=['"]([^'"]+)['"]\s*%}/g, (_, id) => {
      const videoId = id.trim();
      if (!/^[\w-]{11}$/.test(videoId)) throw new Error(`Invalid video ID: ${videoId}`);
      report.conversions.push({ filename, video: videoId });
      return `<iframe class="video-embed" src="https://www.youtube-nocookie.com/embed/${videoId}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    });
  if (original.img_path) {
    // Resolve image paths relative to Chirpy's img_path, if any.
    const tree = processor.parse(body);
    const changes = [];
    function visit(node) {
      if (node.type === 'image' && !/^(?:https?:|\/|data:)/.test(node.url)) {
        const fragment = body.slice(node.position.start.offset, node.position.end.offset);
        changes.push([node.position.start.offset, node.position.end.offset, fragment.replace(node.url, original.img_path + node.url)]);
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
    for (const [start, end, replacement] of changes.reverse()) body = body.slice(0, start) + replacement + body.slice(end);
  }
  // Normalize language labels without changing code samples.
  body = body.replace(/^(```+|~~~+)([A-Za-z][\w+-]*)[ \t]*$/gm, (_, fence, language) => fence + language.toLowerCase());
  const tree = processor.parse(body);
  function visit(node) {
    if (node.url) asset(node.url);
    for (const child of node.children ?? []) visit(child);
  }
  visit(tree);
  for (const html of body.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)) asset(html[1]);
  const image = typeof original.image === 'string' ? original.image : original.image?.path;
  if (!image) throw new Error(`Missing cover: ${filename}`);
  asset(image);
  const title = original.title || originalSlug.replaceAll('-', ' ').replaceAll('_', ' ');
  const difficulty = tags.find(tag => ['very easy', 'easy', 'medium', 'hard', 'insane'].includes(tag.toLowerCase()));
  const metadata = {
    title,
    description: original.description || title,
    date,
    type: categories.join(' · ') || 'Article',
    categories,
    tags,
    image,
    pin: original.pin ?? false,
    readingTime: Math.max(1, Math.ceil(body.split(/\s+/).length / 220)),
    ...(difficulty ? { difficulty: difficulty[0].toUpperCase() + difficulty.slice(1) } : {}),
    legacySlug: originalSlug,
  };
  fs.writeFileSync(path.join(destination, `${slug}.md`), `---\n${yaml.dump(metadata, { lineWidth: -1, noRefs: true })}---\n\n${body.trim()}\n`);
  report.posts.push({ source: filename, slug, title, categories, tags });
}
if (report.missingAssets.length) throw new Error(`Missing assets: ${JSON.stringify(report.missingAssets)}`);
for (const [target, sourceFile] of assets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(sourceFile, target);
}
report.assetCount = assets.size;
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/migration-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Imported ${report.posts.length} posts, ${assets.size} assets; normalized ${report.normalizedAssets.length} encoded filenames.`);
