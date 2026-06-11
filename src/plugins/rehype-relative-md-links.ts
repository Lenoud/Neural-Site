import { visit } from 'unist-util-visit';

export function rehypeRelativeMdLinks(options: { byPath: Map<string, { id: string }>; byName: Map<string, any[]>; base?: string }) {
  const { byPath, byName, base = '/' } = options;

  return (tree: any, file: any) => {
    const currentPath = file?.history?.[0]
      ?.replace(/.*\/src\/content\/notes\//, '')
      ?.replace(/\.md$/, '')
      ?.toLowerCase() || '';

    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'a') return;
      const hrefIdx = node.properties?.href != null ? 'href' : null;
      if (!hrefIdx) return;

      let href = String(node.properties[hrefIdx]);
      if (!href) return;
      if (/^(https?:|\/\/|#|mailto:)/.test(href)) return;
      // 编辑器可能将路径百分号编码（空格、中文）
      try { href = decodeURIComponent(href); } catch { /* 非法编码序列，按原值处理 */ }
      if (!href.endsWith('.md')) return;

      // 去掉 .md 后缀
      const linkTarget = href.replace(/\.md$/, '');
      let resolvedId: string | null = null;

      // 尝试完整路径匹配
      const pathMatch = byPath.get(linkTarget.toLowerCase());
      if (pathMatch) {
        resolvedId = pathMatch.id;
      } else {
        // 去掉目录前缀，用文件名匹配
        const fileName = linkTarget.includes('/') ? linkTarget.slice(linkTarget.lastIndexOf('/') + 1) : linkTarget;
        const candidates = byName.get(fileName.toLowerCase());
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
        node.properties[hrefIdx] = `${base}notes/${resolvedId}`;
      }
    });
  };
}
