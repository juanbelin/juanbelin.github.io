import { researchPage, researchPageHref } from '@/lib/research-pagination.mjs';

const root = document.querySelector<HTMLElement>('[data-research-index]');
const form = document.querySelector<HTMLFormElement>('#researchFilters');
const category = document.querySelector<HTMLSelectElement>('#researchCategory');
const tag = document.querySelector<HTMLSelectElement>('#researchTag');
const results = document.querySelector<HTMLElement>('#researchResults');
const empty = document.querySelector<HTMLElement>('#researchEmpty');
const list = document.querySelector<HTMLElement>('#researchList');
const pagination = document.querySelector<HTMLElement>('[data-research-pagination]');
const template = document.querySelector<HTMLTemplateElement>('#researchCatalog');

if (root && form && category && tag && results && empty && list && pagination && template) {
  const records = [...template.content.querySelectorAll<HTMLAnchorElement>('[data-research-card]')].map(element => ({
    element,
    categories: JSON.parse(element.dataset.categories ?? '[]') as string[],
    tags: JSON.parse(element.dataset.tags ?? '[]') as string[],
  }));
  form.hidden = false;

  const render = (requestedPage: number) => {
    const filtered = records.filter(record => (!category.value || record.categories.includes(category.value)) && (!tag.value || record.tags.includes(tag.value)));
    const state = researchPage(filtered.length, requestedPage);
    list.replaceChildren(...filtered.slice(state.start, state.end).map(record => {
      const card = record.element.cloneNode(true) as HTMLAnchorElement;
      card.classList.add('in');
      return card;
    }));
    results.textContent = filtered.length ? `Showing ${state.start + 1}–${state.end} of ${filtered.length} posts` : '0 posts';
    empty.hidden = filtered.length !== 0;
    pagination.hidden = state.pages <= 1;
    pagination.replaceChildren();
    const pageLink = (label: string, page: number, disabled = false) => {
      const link = document.createElement(disabled ? 'span' : 'a');
      link.className = 'pagination-link'; link.textContent = label;
      if (disabled) link.setAttribute('aria-disabled', 'true');
      else {
        (link as HTMLAnchorElement).href = researchPageHref(page, category.value, tag.value);
        link.setAttribute('data-research-page', '');
        if (page === state.page && /^\d+$/.test(label)) link.setAttribute('aria-current', 'page');
      }
      return link;
    };
    pagination.append(pageLink('← Previous', state.page - 1, state.page === 1));
    for (let page = 1; page <= state.pages; page++) pagination.append(pageLink(String(page), page));
    pagination.append(pageLink('Next →', state.page + 1, state.page === state.pages));
    document.title = `${state.page > 1 ? `Research — Page ${state.page}` : 'Research'} — ${root.dataset.siteName}`;
    return researchPageHref(state.page, category.value, tag.value);
  };
  const navigate = (page: number, push: boolean) => {
    const href = render(page);
    if (push && href !== window.location.pathname + window.location.search) window.history.pushState(null, '', href);
    else window.history.replaceState(null, '', href);
  };
  const readUrl = () => {
    const url = new URL(window.location.href);
    category.value = url.searchParams.get('category') ?? '';
    tag.value = url.searchParams.get('tag') ?? '';
    navigate(Number(url.pathname.match(/\/research\/page\/(\d+)/)?.[1] ?? 1), false);
  };
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', () => navigate(1, true));
  form.addEventListener('reset', event => {
    event.preventDefault(); category.value = ''; tag.value = ''; navigate(1, true);
  });
  pagination.addEventListener('click', event => {
    if (!(event.target instanceof Element) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest<HTMLAnchorElement>('a[data-research-page]');
    if (!link) return;
    event.preventDefault();
    navigate(Number(new URL(link.href).pathname.match(/\/research\/page\/(\d+)/)?.[1] ?? 1), true);
    list.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('popstate', readUrl);
  readUrl();
}
