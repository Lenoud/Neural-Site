import { visit } from 'unist-util-visit';

/**
 * 解析 wikilink 内部语法
 * [[target]]            → { target, heading, alias }
 * [[target#heading]]    → { target, heading, alias }
 * [[#heading]]          → { target: '', heading, alias }  (当前页)
 * [[target|alias]]      → { target, heading: '', alias }
 * [[target#heading|a]]  → { target, heading, alias: 'a' }
 */
function parseWikilink(raw: string) {
  let alias = raw;
  let targetAndHeading = raw;

  if (raw.includes('|')) {
    const pipeIdx = raw.indexOf('|');
    alias = raw.slice(pipeIdx + 1);
    targetAndHeading = raw.slice(0, pipeIdx);
  }

  let target = targetAndHeading;
  let heading = '';

  if (targetAndHeading.includes('#')) {
    const hashIdx = targetAndHeading.indexOf('#');
    target = targetAndHeading.slice(0, hashIdx);
    heading = targetAndHeading.slice(hashIdx + 1);
  }

  // 默认 alias
  if (alias === targetAndHeading) {
    alias = heading ? heading : target.split('/').pop() || target;
  }

  return { target, heading, alias };
}

export function remarkWikilinks(options: { byPath: Map<string, { id: string }>; byName: Map<string, any[]> }) {
  const { byPath, byName } = options;
  return (tree: any, file: any) => {
    const currentPath = file?.history?.[0]
      ?.replace(/.*\/src\/content\/notes\//, '')
      ?.replace(/\.md$/, '')
      ?.toLowerCase() || '';

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

        const { target, heading, alias } = parseWikilink(match[1]);

        // [[#heading]] — 当前页内跳转
        if (!target && heading) {
          parts.push({
            type: 'link',
            url: `#${heading}`,
            children: [{ type: 'text', value: alias }],
          });
          lastIndex = regex.lastIndex;
          continue;
        }

        // 解析文档链接
        let resolvedId: string | null = null;

        const pathMatch = byPath.get(target.toLowerCase());
        if (pathMatch) {
          resolvedId = pathMatch.id;
        } else {
          const candidates = byName.get(target.toLowerCase());
          if (candidates && candidates.length > 0) {
            if (candidates.length === 1) {
              resolvedId = candidates[0].id;
            } else if (currentPath) {
              const currentDir = currentPath.split('/').slice(0, -1).join('/');
              const sameGroup = candidates.find((c: any) => c.id.startsWith(currentDir + '/'));
              resolvedId = sameGroup ? sameGroup.id : candidates[0].id;
            } else {
              resolvedId = candidates[0].id;
            }
          }
        }

        if (resolvedId) {
          const url = heading ? `/notes/${resolvedId}#${heading}` : `/notes/${resolvedId}`;
          parts.push({
            type: 'link',
            url,
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
