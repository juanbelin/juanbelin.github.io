export const reportsRepository = 'https://github.com/juanbelin/Writeups-CTFs-Challenges';
export const reportsTreeUrl = 'https://api.github.com/repos/juanbelin/Writeups-CTFs-Challenges/git/trees/main?recursive=1';
export const platforms = [
  { folder: 'HTB', label: 'Hack The Box' },
  { folder: 'Hackmyvm', label: 'HackMyVM' },
  { folder: 'Dockerlabs', label: 'Dockerlabs' },
  { folder: 'Vulnlab', label: 'Vulnlab' },
  { folder: 'LetsDefend', label: 'LetsDefend' },
  { folder: 'BugBountyLabs', label: 'BugBountyLabs' },
  { folder: 'OverTheWire', label: 'OverTheWire' },
  { folder: 'RootMe Challenges', label: 'RootMe' },
  { folder: 'TheHackerLabs', label: 'TheHackerLabs' },
  { folder: 'Vulnhub', label: 'VulnHub' },
];
export const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
export const platformLabel = folder => platforms.find(platform => platform.folder.toLowerCase() === folder.toLowerCase())?.label ?? folder;

export function createReportCatalog(tree) {
  if (!Array.isArray(tree)) throw new Error('Invalid repository tree');
  const formats = new Set(['pdf', 'md', 'docx', 'txt', 'html']);
  return tree.filter(file => {
    if (file.type !== 'blob' || !file.path?.includes('/')) return false;
    const name = file.path.split('/').at(-1);
    const format = name.split('.').at(-1).toLowerCase();
    return formats.has(format) && !/^(readme|license|licence|changelog|requirements)\b/i.test(name);
  }).map(file => {
    const parts = file.path.split('/');
    if (parts.some(part => !part || part === '.' || part === '..')) throw new Error('Invalid report path');
    const name = parts.at(-1);
    const format = name.split('.').at(-1).toLowerCase();
    const folder = parts[0];
    const encoded = encodePath(file.path);
    return {
      path: file.path, folder, platform: platformLabel(folder),
      title: name.replace(/\.[^.]+$/, '').replaceAll('_', ' '),
      section: parts.slice(1, -1).join(' / '), format,
      remoteUrl: `https://raw.githubusercontent.com/juanbelin/Writeups-CTFs-Challenges/main/${encoded}`,
      sourceUrl: `${reportsRepository}/blob/main/${encoded}`,
      size: file.size ?? 0,
    };
  }).sort((a, b) => a.platform.localeCompare(b.platform, 'en') || a.title.localeCompare(b.title, 'en', { numeric: true }));
}
