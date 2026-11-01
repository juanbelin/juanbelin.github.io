import { searchPosts } from '@/lib/search-posts.mjs';
interface SearchPost { url: string; title: string; description: string; categories: string[]; tags: string[]; body: string; }
const dialog = document.querySelector<HTMLDialogElement>('#postSearch');
const input = document.querySelector<HTMLInputElement>('#postSearchInput');
const results = document.querySelector<HTMLUListElement>('[data-post-search-results]');
const status = document.querySelector<HTMLElement>('[data-post-search-status]');
if (dialog && input && results && status) {
  let posts: SearchPost[] | undefined;
  let loading: Promise<void> | undefined;
  let opener: HTMLElement | undefined;
  function render() {
    if (!posts || !results || !status || !input) return;
    const matches: SearchPost[] = searchPosts(posts, input.value);
    results.replaceChildren();
    status.textContent = input.value.trim() ? (matches.length ? `${matches.length} post${matches.length === 1 ? '' : 's'} found` : 'No posts found. Try another search.') : 'Recent posts';
    for (const post of matches) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = post.url;
      const title = document.createElement('strong'); title.textContent = post.title;
      const description = document.createElement('span'); description.textContent = post.description;
      link.append(title, description); item.append(link); results.append(item);
    }
  }
  async function load() {
    if (posts) return render();
    if (loading) return loading;
    status!.textContent = 'Loading posts…';
    loading = (async () => {
      try {
        const response = await fetch('/search/posts.json');
        if (!response.ok) throw new Error('Search unavailable');
        posts = await response.json(); render();
      } catch {
        status!.textContent = 'Unable to load search. Close and reopen to try again.';
      } finally { loading = undefined; }
    })();
    await loading;
  }
  document.querySelectorAll<HTMLButtonElement>('[data-open-post-search]').forEach(button => {
    button.addEventListener('click', () => {
      opener = button;
      dialog.showModal(); input.focus(); void load();
    });
  });
  document.querySelector('[data-close-post-search]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus());
  input.addEventListener('input', render);
}
