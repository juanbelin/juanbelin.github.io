export default function scrollTables() {
  return tree => {
    function walk(parent) {
      if (!parent.children) return;
      for (let index = 0; index < parent.children.length; index++) {
        const node = parent.children[index];
        if (node.type === 'element' && node.tagName === 'table') {
          parent.children[index] = {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['table-scroll'],
              tabIndex: 0,
              role: 'region',
              ariaLabel: 'Scrollable table',
            },
            children: [node],
          };
        } else walk(node);
      }
    }
    walk(tree);
  };
}
