import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { socialImage } from '@/lib/social-image.mjs';

export async function getStaticPaths() {
  return (await getCollection('research', ({ data }) => !data.draft)).map(entry => ({
    params: { slug: entry.id },
    props: { title: entry.data.title, image: entry.data.image, categories: entry.data.categories },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const image = await socialImage(props.title, props.image, props.categories);
  return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/jpeg' } });
};
