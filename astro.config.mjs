import { defineConfig } from 'astro/config';
import { remarkWikilinks } from './src/plugins/remark-wikilinks';
import { rehypeRelativeMdLinks } from './src/plugins/rehype-relative-md-links';
import path from 'node:path';
import fs from 'node:fs';

// GitHub Pages 项目站点需要 base = /<repo-name>/
// 本地开发和内部 Nginx 部署不需要前缀
// 通过环境变量 BASE_PATH 控制，CI 中设置 BASE_PATH=/Neural-Site/
const base = process.env.BASE_PATH || '/';

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
        // Astro glob loader: 去点号、空格变短横线、全小写
        const astroId = relativePath.replace(/\./g, '').replace(/ /g, '-').toLowerCase();

        byPath.set(relativePath, { id: astroId });
        byPath.set(relativePath.toLowerCase(), { id: astroId });

        const list = byName.get(fileName.toLowerCase()) || [];
        list.push({ id: astroId });
        byName.set(fileName.toLowerCase(), list);
      }
    }
  }

  walk(notesDir);
  return { byPath, byName };
}

// 构建图片文件索引，支持 Obsidian 的 ![[image.png]] 语法
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']);
function buildImageIndex() {
  const notesDir = path.resolve('./src/content/notes');
  const attachmentsDir = path.resolve('./attachments');
  const byPath = new Map();
  const byName = new Map();

  function walk(dir, root) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, root);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (imageExtensions.has(ext)) {
          const relativeToRoot = path.relative(root, fullPath);

          byPath.set(relativeToRoot, relativeToRoot);
          byPath.set(relativeToRoot.toLowerCase(), relativeToRoot);

          const list = byName.get(entry.name.toLowerCase()) || [];
          list.push(relativeToRoot);
          byName.set(entry.name.toLowerCase(), list);
        }
      }
    }
  }

  walk(notesDir, notesDir);
  walk(attachmentsDir, attachmentsDir);
  return { byPath, byName };
}

const imageIndex = buildImageIndex();

const { byPath, byName } = buildSlugIndexFromFS();

export default defineConfig({
  base,
  markdown: {
    remarkPlugins: [[remarkWikilinks, { byPath, byName, base, imageIndex }]],
    rehypePlugins: [[rehypeRelativeMdLinks, { byPath, byName, base }]],
  },
  vite: {
  },
});
