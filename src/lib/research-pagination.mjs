export const RESEARCH_PAGE_SIZE = 10;

export function researchPage(total, requestedPage = 1) {
  const pages = Math.max(1, Math.ceil(total / RESEARCH_PAGE_SIZE));
  const page = Math.max(1, Math.min(pages, Math.floor(Number(requestedPage)) || 1));
  const start = (page - 1) * RESEARCH_PAGE_SIZE;
  return { page, pages, start, end: Math.min(total, start + RESEARCH_PAGE_SIZE), total };
}

export function researchPageHref(page, category = '', tag = '') {
  const path = page <= 1 ? '/research/' : `/research/page/${page}/`;
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  return path + (params.size ? `?${params}` : '');
}
