import { rehypeHeadingIds } from '@astrojs/markdown-remark';

// Use Astro's own slug generator to preserve Unicode and duplicate-heading IDs.
export default function headingLinks() {
  return (tree, file) => {
    rehypeHeadingIds()(tree, file);
    const containsLink = node => node.type === 'element' && ['a', 'img', 'video'].includes(node.tagName)
      || (node.children ?? []).some(containsLink);
    const icon = () => ({
      type: 'element', tagName: 'svg',
      properties: { className: ['heading-link-icon'], viewBox: '0 0 24 24', width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, ariaHidden: 'true' },
      children: [{ type: 'element', tagName: 'path', properties: { d: 'M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l1.7-1.7' }, children: [] }],
    });
    function walk(node) {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName) && node.properties?.id) {
        const hasLink = containsLink(node);
        const anchor = {
          type: 'element', tagName: 'a',
          properties: {
            href: `#${node.properties.id}`, className: ['heading-anchor'],
            dataCopyHeading: '', title: 'Copy link to this section',
            ...(hasLink ? { ariaLabel: 'Copy link to this section' } : {}),
          },
          children: hasLink ? [icon()] : [...node.children, icon()],
        };
        node.children = hasLink ? [...node.children, anchor] : [anchor];
        return;
      }
      for (const child of node.children ?? []) walk(child);
    }
    walk(tree);
  };
}
