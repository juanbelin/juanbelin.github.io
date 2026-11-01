import { defineConfig } from 'astro/config';
import rehypeRaw from 'rehype-raw';
import headingLinks from './src/plugins/rehype-heading-links.mjs';
import codeToolbar from './src/plugins/rehype-code-toolbar.mjs';
import callouts from './src/plugins/remark-callouts.mjs';

export default defineConfig({
  site: 'https://juanbelin.github.io',
  trailingSlash: 'ignore',
  markdown: { remarkPlugins: [callouts], rehypePlugins: [rehypeRaw, headingLinks, codeToolbar] },
  build: {
    format: 'directory',
  },
});
