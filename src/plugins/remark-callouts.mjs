const definitions = {
  note: ['note', 'Note'], info: ['info', 'Info'], todo: ['info', 'To do'],
  abstract: ['note', 'Abstract'], summary: ['note', 'Summary'],
  tip: ['tip', 'Tip'], hint: ['tip', 'Hint'],
  success: ['success', 'Success'], check: ['success', 'Check'], done: ['success', 'Done'],
  question: ['question', 'Question'], help: ['question', 'Help'], faq: ['question', 'FAQ'],
  warning: ['warning', 'Warning'], caution: ['warning', 'Caution'], attention: ['warning', 'Attention'],
  danger: ['danger', 'Danger'], error: ['danger', 'Error'], failure: ['danger', 'Failure'], fail: ['danger', 'Failure'], bug: ['danger', 'Bug'],
  important: ['important', 'Important'], example: ['example', 'Example'],
  quote: ['quote', 'Quote'], cite: ['quote', 'Quote'],
};

export default function callouts() {
  return tree => {
    function walk(node) {
      if (node.type === 'blockquote') {
        const paragraph = node.children[0];
        const first = paragraph?.type === 'paragraph' && paragraph.children[0];
        const match = first?.type === 'text' && first.value.match(/^\s*\[!([\w-]+)\]([+-])?[ \t]*/i);
        if (match) {
          const requestedType = match[1].toLowerCase();
          const [style, defaultTitle] = definitions[requestedType] ?? ['note', requestedType[0].toUpperCase() + requestedType.slice(1)];
          const fold = match[2];
          const fragments = [{ ...first, value: first.value.slice(match[0].length) }, ...paragraph.children.slice(1)];
          const title = [];
          let body = [];
          for (let i = 0; i < fragments.length; i++) {
            const fragment = fragments[i];
            if (fragment.type === 'break') { body = fragments.slice(i + 1); break; }
            if (fragment.type === 'text' && fragment.value.includes('\n')) {
              const newline = fragment.value.indexOf('\n');
              if (newline) title.push({ ...fragment, value: fragment.value.slice(0, newline) });
              const rest = fragment.value.slice(newline + 1);
              body = [...(rest ? [{ ...fragment, value: rest }] : []), ...fragments.slice(i + 1)];
              break;
            }
            if (fragment.type !== 'text' || fragment.value) title.push(fragment);
          }
          const hasTitle = title.some(fragment => fragment.type !== 'text' || fragment.value.trim());
          const bodyNodes = [...(body.length ? [{ ...paragraph, children: body }] : []), ...node.children.slice(1)];
          node.data = {
            ...node.data, hName: fold ? 'details' : 'aside',
            hProperties: {
              className: ['callout', `callout-${style}`], dataCallout: requestedType,
              ...(fold ? { open: fold === '+' } : { role: 'note' }),
            },
          };
          node.children = [{
            type: 'paragraph', data: { hName: fold ? 'summary' : 'p', hProperties: { className: ['callout-title'] } },
            children: hasTitle ? title : [{ type: 'text', value: defaultTitle }],
          }, ...bodyNodes];
        }
      }
      for (const child of node.children ?? []) walk(child);
    }
    walk(tree);
  };
}
