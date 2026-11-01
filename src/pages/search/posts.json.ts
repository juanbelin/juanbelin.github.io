import { getCollection } from 'astro:content';
export async function GET() {
  const entries = (await getCollection('research', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const posts = entries.map(({ id, data, body }) => ({
    url: `/research/${id}`, title: data.title, description: data.description,
    categories: data.categories, tags: data.tags, body: body ?? '',
  }));
  return new Response(JSON.stringify(posts), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
