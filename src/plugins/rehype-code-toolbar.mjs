export default function codeToolbar() {
  return tree => {
    function walk(parent) {
      if (!parent.children) return;
      for (let index = 0; index < parent.children.length; index++) {
        const node = parent.children[index];
        if (node.type === 'element' && node.tagName === 'pre' && node.children?.some(child => child.tagName === 'code')) {
          const language = String(node.properties?.dataLanguage ?? node.properties?.['data-language'] ?? 'text');
          const label = language === 'plaintext' ? 'text' : language;
          parent.children[index] = {
            type: 'element', tagName: 'div', properties: { className: ['code-block'], dataCodeBlock: '' },
            children: [
              { type: 'element', tagName: 'div', properties: { className: ['code-toolbar'] }, children: [
                { type: 'element', tagName: 'span', properties: { className: ['code-language'] }, children: [{ type: 'text', value: label }] },
                { type: 'element', tagName: 'button', properties: { type: 'button', className: ['code-copy'], dataCopyCode: '', ariaLabel: `Copy ${label} code` }, children: [{ type: 'text', value: 'Copy' }] },
                { type: 'element', tagName: 'span', properties: { className: ['sr-only'], role: 'status', ariaLive: 'polite', dataCodeStatus: '' }, children: [] },
              ] },
              node,
            ],
          };
        } else walk(node);
      }
    }
    walk(tree);
  };
}
