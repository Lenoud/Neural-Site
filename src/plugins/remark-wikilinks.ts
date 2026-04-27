import { visit } from 'unist-util-visit';

export function remarkWikilinks(slugMap: Map<string, string>) {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;

      const regex = /\[\[(.*?)\]\]/g;
      const text = node.value;
      const parts: any[] = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const target = match[1].split('|')[0];
        const slug = slugMap.get(target);
        const alias = match[1].includes('|') ? match[1].split('|')[1] : target;

        if (slug) {
          parts.push({
            type: 'link',
            url: `/notes/${slug}`,
            children: [{ type: 'text', value: alias }],
          });
        } else {
          parts.push({
            type: 'html',
            value: `<span class="wikilink-broken" title="文档不存在: ${target}">${alias}</span>`,
          });
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts);
      }
    });
  };
}
