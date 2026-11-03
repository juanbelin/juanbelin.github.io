export const normalizeSearch = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Require every word; rank title, headings, then tags. */
export function searchPosts(posts, query) {
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return posts.slice(0, 8);
  return posts.map((post, order) => {
    const fields = [post.title, (post.headings ?? []).join(' '), post.tags.join(' ')].map(normalizeSearch);
    if (!terms.every(term => fields.some(field => field.includes(term)))) return null;
    const score = terms.reduce((total, term) => total + fields.reduce((sum, field, i) => sum + (field.includes(term) ? [8, 4, 2][i] : 0), 0), 0);
    return { post, score, order };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.order - b.order).map(hit => hit.post);
}
