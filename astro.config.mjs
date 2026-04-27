import { defineConfig } from 'astro/config';
import { remarkWikilinks } from './src/plugins/remark-wikilinks';
import path from 'node:path';
import fs from 'node:fs';

// 配置阶段无法使用 getCollection，直接读文件系统构建索引
function buildSlugIndexFromFS() {
  const notesDir = path.resolve('./src/content/notes');
  const byPath = new Map();
  const byName = new Map();

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const relativePath = path.relative(notesDir, fullPath).replace(/\.md$/, '');
        const fileName = path.basename(entry.name, '.md');
        // Astro glob loader 将 id 转小写
        const astroId = relativePath.toLowerCase();

        // 按完整路径索引：原始大小写 + 小写
        byPath.set(relativePath, { id: astroId });
        byPath.set(relativePath.toLowerCase(), { id: astroId });

        // 按文件名索引
        const list = byName.get(fileName.toLowerCase()) || [];
        list.push({ id: astroId });
        byName.set(fileName.toLowerCase(), list);
      }
    }
  }

  walk(notesDir);
  return { byPath, byName };
}

const { byPath, byName } = buildSlugIndexFromFS();

export default defineConfig({
  markdown: {
    remarkPlugins: [[remarkWikilinks, { byPath, byName }]],
  },
  vite: {
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
      },
    },
  },
});
