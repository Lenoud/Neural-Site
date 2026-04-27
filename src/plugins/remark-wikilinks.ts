import { visit } from 'unist-util-visit';

/**
 * remark 插件：将 [[wikilinks]] 转为 <a> 标签
 * 支持路径匹配、同名消歧、别名语法
 */
export function remarkWikilinks(options: { byPath: Map<string, { id: string }>; byName: Map<string, any[]> }) {
  const { byPath, byName } = options;
  return (tree: any, file: any) => {
    // 获取当前文档路径，用于同组优先匹配
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

        const raw = match[1];
        const target = raw.split('|')[0];
        const alias = raw.includes('|') ? raw.split('|')[1] : target;

        // 解析：路径优先 → 文件名 → 同组优先 → 兜底
        let resolvedId: string | null = null;

        // 精确路径匹配
        const pathMatch = byPath.get(target.toLowerCase());
        if (pathMatch) {
          resolvedId = pathMatch.id;
        } else {
          // 文件名匹配
          const candidates = byName.get(target.toLowerCase());
          if (candidates && candidates.length > 0) {
            if (candidates.length === 1) {
              resolvedId = candidates[0].id;
            } else if (currentPath) {
              // 同组优先
              const currentDir = currentPath.split('/').slice(0, -1).join('/');
              const sameGroup = candidates.find((c: any) => c.id.startsWith(currentDir + '/'));
              resolvedId = sameGroup ? sameGroup.id : candidates[0].id;
            } else {
              resolvedId = candidates[0].id;
            }
          }
        }

        if (resolvedId) {
          parts.push({
            type: 'link',
            url: `/notes/${resolvedId}`,
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
