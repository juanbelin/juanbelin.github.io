const downloadStatus = document.querySelector<HTMLElement>('[data-report-download-status]');

document.addEventListener('click', async event => {
  if (!(event.target instanceof Element) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest<HTMLAnchorElement>('[data-report-download]');
  if (!link) return;
  event.preventDefault();
  if (link.hasAttribute('aria-busy')) return;
  link.setAttribute('aria-busy', 'true');
  if (downloadStatus) downloadStatus.textContent = 'Preparing download from GitHub…';
  try {
    const response = await fetch(link.href);
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const objectUrl = URL.createObjectURL(await response.blob());
    const download = document.createElement('a');
    download.href = objectUrl;
    download.download = link.dataset.filename ?? 'report';
    document.body.append(download);
    download.click(); download.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    if (downloadStatus) downloadStatus.textContent = 'Download started.';
  } catch {
    if (downloadStatus) downloadStatus.textContent = 'Unable to download automatically. Open the report on GitHub to download it.';
  } finally {
    link.removeAttribute('aria-busy');
  }
});
export {};
