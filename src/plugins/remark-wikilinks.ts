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

export function remarkWikilinks(options: { byPath: Map<string, { id: string }>; byName: Map<string, any[]>; base?: string; imageIndex?: { byPath: Map<string, string>; byName: Map<string, string[]> } }) {
  const { byPath, byName, base = '/', imageIndex } = options;

  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']);
  const combinedRegex = /(\!?)\[\[(.*?)\]\]/g;

  return (tree: any, file: any) => {
    const currentPath = file?.history?.[0]
      ?.replace(/.*\/src\/content\/notes\//, '')
      ?.replace(/\.md$/, '')
      ?.toLowerCase() || '';

    // 第二遍：将标准 markdown 链接 [text](xx.md) 解析为内部链接
    visit(tree, 'link', (node: any) => {
      const url = node.url;
      if (!url || !url.endsWith('.md')) return;
      // 跳过外部链接
      if (/^(https?:|\/)/.test(url)) return;

      const linkTarget = url.replace(/\.md$/, '').replace(/\./g, '');
      let resolvedId: string | null = null;

      const pathMatch = byPath.get(linkTarget.toLowerCase());
      if (pathMatch) {
        resolvedId = pathMatch.id;
      } else {
        // 去掉可能的目录前缀，用文件名匹配
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
        node.url = `${base}notes/${resolvedId}`;
      }
    });

    // 第一遍：处理 [[wikilinks]]
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;

      const text = node.value;
      const parts: any[] = [];
      let lastIndex = 0;
      let match;

      while ((match = combinedRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const isImage = match[1] === '!';
        const raw = match[2];

        if (isImage) {
          // ![[image.png]] 或 ![[image.png|300]] 或 ![[path/image.png]]
          const pipeIdx = raw.indexOf('|');
          const imgTarget = pipeIdx >= 0 ? raw.slice(0, pipeIdx) : raw;
          const imgSize = pipeIdx >= 0 ? raw.slice(pipeIdx + 1) : '';
          const ext = imgTarget.includes('.') ? imgTarget.slice(imgTarget.lastIndexOf('.')).toLowerCase() : '';

          if (imageExts.has(ext) && imageIndex) {
            // 路径精确匹配优先
            let found = imageIndex.byPath.get(imgTarget.toLowerCase());
            if (!found) {
              const slashIdx = imgTarget.lastIndexOf('/');
              const fileName = slashIdx >= 0 ? imgTarget.slice(slashIdx + 1) : imgTarget;
              const candidates = imageIndex.byName.get(fileName.toLowerCase());
              if (candidates) {
                if (candidates.length === 1) {
                  found = candidates[0];
                } else if (currentPath) {
                  // 同组优先
                  const currentDir = currentPath.split('/').slice(0, -1).join('/');
                  const sameGroup = candidates.find((c: string) => c.toLowerCase().startsWith(currentDir));
                  found = sameGroup || candidates[0];
                } else {
                  found = candidates[0];
                }
              }
            }
            if (found) {
              const imgSrc = `${base}images/${found}`;
              let style = '';
              if (imgSize && /^\d+$/.test(imgSize)) {
                style = ` style="width:${imgSize}px"`;
              } else if (imgSize && /^\d+%$/.test(imgSize)) {
                style = ` style="width:${imgSize}"`;
              }
              parts.push({
                type: 'html',
                value: `<img src="${imgSrc}" alt="${imgTarget}"${style} loading="lazy" />`,
              });
            } else {
              parts.push({
                type: 'html',
                value: `<span class="wikilink-broken" title="图片不存在: ${imgTarget}">${imgTarget}</span>`,
              });
            }
          } else if (imageExts.has(ext)) {
            // 没有图片索引，直接用路径
            parts.push({
              type: 'html',
              value: `<span class="wikilink-broken" title="图片不存在: ${imgTarget}">${imgTarget}</span>`,
            });
          } else {
            // ![[page]] 嵌入笔记（Obsidian 嵌入语法，暂显示为链接）
            parts.push({
              type: 'html',
              value: `<span class="wikilink-broken" title="暂不支持嵌入笔记: ${raw}">${raw}</span>`,
            });
          }

          lastIndex = combinedRegex.lastIndex;
          continue;
        }

        // 原有 [[link]] 逻辑
        const { target, heading, alias } = parseWikilink(raw);

        if (!target && heading) {
          parts.push({
            type: 'link',
            url: `#${heading}`,
            children: [{ type: 'text', value: alias }],
          });
          lastIndex = combinedRegex.lastIndex;
          continue;
        }

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
          const url = heading ? `${base}notes/${resolvedId}#${heading}` : `${base}notes/${resolvedId}`;
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

        lastIndex = combinedRegex.lastIndex;
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
