import { visit } from 'unist-util-visit';

/**
 * Remark plugin: Obsidian 扩展语法支持
 * 1. ==高亮== → <mark>高亮</mark>
 * 2. %%注释%% → 静默移除
 * 3. > [!type] 标注 → 带样式的 callout
 */
export function remarkObsidianExt() {
  return (tree: any) => {
    // 处理 ==高亮== 和 %%注释%%
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;

      const text = node.value;
      if (!text.includes('==') && !text.includes('%%')) return;

      const parts: any[] = [];
      let lastIndex = 0;
      // 匹配 ==text== 或 %%text%%
      const regex = /(==|%%)([\s\S]*?)\1/g;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        if (match[1] === '==') {
          // 高亮 → <mark>
          parts.push({
            type: 'html',
            value: `<mark>${match[2]}</mark>`,
          });
        }
        // %%注释%% → 静默移除，不输出任何内容

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts);
      }
    });

    // 处理 > [!type] callout 标注
    visit(tree, 'blockquote', (node: any) => {
      const firstChild = node.children?.[0];
      if (!firstChild) return;

      // 获取 blockquote 第一个段落的内容
      const firstText = extractText(firstChild);
      const calloutMatch = firstText?.match(/^\[!(\w+)\]\s*(.*)/);
      if (!calloutMatch) return;

      const type = calloutMatch[1].toLowerCase();
      const title = calloutMatch[2] || capitalize(calloutMatch[1]);

      // 移除标题行 [!type] title
      const paragraph = firstChild;
      if (paragraph.children?.[0]?.type === 'text') {
        const remaining = paragraph.children[0].value.replace(/^\[!\w+\]\s*.*(\n?)/, '');
        if (remaining.trim() === '' && paragraph.children.length === 1) {
          // 标题行是唯一内容，移除整个段落
          node.children.shift();
        } else {
          paragraph.children[0].value = remaining;
        }
      }

      // 在 blockquote 前插入标题
      node.data = node.data || {};
      node.data.hProperties = {
        className: `callout callout-${type}`,
      };
      node.children.unshift({
        type: 'html',
        value: `<div class="callout-title">${title}</div>`,
      });
    });
  };
}

function extractText(node: any): string | undefined {
  if (node.type === 'text') return node.value;
  if (node.children) {
    return node.children.map((c: any) => extractText(c)).join('');
  }
  return undefined;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
