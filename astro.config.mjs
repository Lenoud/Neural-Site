import { defineConfig } from 'astro/config';
import { remarkWikilinks } from './src/plugins/remark-wikilinks';
import path from 'node:path';
import fs from 'node:fs';

// 配置阶段无法使用 getCollection，直接读文件系统
function buildSlugMapFromFS() {
  const notesDir = path.resolve('./src/content/notes');
  const map = new Map();

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        // Astro glob loader 会将 id 转为小写
        const relativePath = path.relative(notesDir, fullPath).replace(/\.md$/, '').toLowerCase();
        const fileName = path.basename(entry.name, '.md');
        // 原始文件名 → 小写 id，用于 [[API规范]] 查找 → api规范
        map.set(fileName, relativePath);
        map.set(fileName.toLowerCase(), relativePath);
      }
    }
  }

  walk(notesDir);
  return map;
}

const slugMap = buildSlugMapFromFS();

export default defineConfig({
  markdown: {
    remarkPlugins: [[remarkWikilinks, slugMap]],
  },
});
