import { getCollection, render } from 'astro:content';
export async function GET() {
  const entries = (await getCollection('research', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const posts = await Promise.all(entries.map(async entry => {
    const { id, data } = entry;
    const { headings } = await render(entry);
    return {
      url: `/research/${id}`, title: data.title, description: data.description,
      tags: data.tags, headings: headings.map(heading => heading.text),
    };
  }));
  return new Response(JSON.stringify(posts), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
