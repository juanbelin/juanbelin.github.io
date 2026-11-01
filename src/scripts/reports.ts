import { createReportCatalog, encodePath, platforms, reportsRepository, reportsTreeUrl } from '@/lib/report-catalog.mjs';

const container = document.querySelector<HTMLElement>('[data-report-platforms]');
const status = document.querySelector<HTMLElement>('[data-reports-status]');
if (container && status && container.dataset.localReports === '0') {
  const label = (tag: string, text: string, className?: string) => {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const externalLink = (text: string, href: string, className: string) => {
    const link = document.createElement('a');
    link.textContent = text; link.href = href; link.className = className;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    return link;
  };
  (async () => {
    try {
      const response = await fetch(reportsTreeUrl, { headers: { Accept: 'application/vnd.github+json' } });
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const tree = await response.json();
      if (tree.truncated || !Array.isArray(tree.tree)) throw new Error('Incomplete repository tree');
      const reports = createReportCatalog(tree.tree);
      const folders = [...new Set(reports.map(report => report.folder))];
      const order = [...platforms.map(platform => platform.folder), ...folders.filter(folder => !platforms.some(platform => platform.folder.toLowerCase() === folder.toLowerCase()))];
      container.replaceChildren();
      for (const folder of order) {
        const entries = reports.filter(report => report.folder.toLowerCase() === folder.toLowerCase());
        if (!entries.length) continue;
        const column = document.createElement('section'); column.className = 'report-platform';
        const heading = label('div', '', 'report-platform-head');
        heading.append(label('h3', `${entries[0].platform.toUpperCase()} (${entries.length})`));
        const browse = `${reportsRepository}/tree/main/${encodePath(folder)}`;
        const sourceLink = externalLink('→', browse, 'report-platform-source');
        sourceLink.setAttribute('aria-label', `Browse ${entries[0].platform} reports on GitHub`);
        heading.append(sourceLink);
        const list = document.createElement('ul'); list.className = 'report-platform-list';
        for (const report of entries) {
          const item = document.createElement('li'); item.className = 'platform-report-row';
          const link = externalLink('', report.sourceUrl, 'platform-report');
          const title = label('span', report.title.toUpperCase());
          if (report.section) title.append(label('small', report.section.toUpperCase()));
          link.append(title, label('span', report.format.toUpperCase(), 'report-format'));
          const download = externalLink('↓', report.remoteUrl, 'report-download');
          download.download = report.path.split('/').at(-1) ?? report.title;
          download.dataset.reportDownload = '';
          download.dataset.filename = download.download;
          download.setAttribute('aria-label', `Download ${report.title}`);
          download.title = 'Download from GitHub';
          item.append(link, download); list.append(item);
        }
        column.append(heading, list); container.append(column);
      }
      status.textContent = reports.length ? `${reports.length} reports · ${folders.length} platforms` : 'Browse my latest reports in the GitHub repository.';
    } catch {
      status.textContent = 'Reports are available in the GitHub repository.';
    }
  })();
}
export {};
