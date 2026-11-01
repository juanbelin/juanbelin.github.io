import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createReportCatalog, reportsTreeUrl } from '../src/lib/report-catalog.mjs';

// Only metadata is stored. Report documents remain hosted on GitHub.
try {
  const sourceIndex = process.argv.indexOf('--tree');
  let result;
  if (sourceIndex >= 0) {
    if (!process.argv[sourceIndex + 1]) throw new Error('Missing tree JSON file');
    result = JSON.parse(await readFile(process.argv[sourceIndex + 1], 'utf8'));
  } else {
    const response = await fetch(reportsTreeUrl, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    result = await response.json();
  }
  if (result.truncated || !Array.isArray(result.tree)) throw new Error('Incomplete repository tree');
  const catalog = createReportCatalog(result.tree);
  await mkdir('src/data', { recursive: true });
  await writeFile('src/data/reports-manifest.json.tmp', JSON.stringify(catalog, null, 2) + '\n');
  await rename('src/data/reports-manifest.json.tmp', 'src/data/reports-manifest.json');
  console.log(`Updated metadata for ${catalog.length} GitHub reports. No documents were downloaded.`);
} catch (error) {
  console.warn(`Report catalog refresh unavailable: ${error.message}. Keeping the saved catalog; browser loading remains available.`);
}
