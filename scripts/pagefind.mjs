import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// 复制图片到 dist/images/
const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']);

function copyImages(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  const entries = execSync(`find "${srcDir}" -type f`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  for (const fullPath of entries) {
    const ext = fullPath.slice(fullPath.lastIndexOf('.')).toLowerCase();
    if (imageExts.has(ext)) {
      const relative = fullPath.slice(srcDir.length + 1);
      const dest = resolve(destDir, relative);
      const destDir2 = resolve(dest, '..');
      if (!existsSync(destDir2)) mkdirSync(destDir2, { recursive: true });
      cpSync(fullPath, dest);
      console.log(`  Copied: ${relative}`);
    }
  }
}

console.log('Copying images...');
mkdirSync('dist/images', { recursive: true });
copyImages(resolve('src/content/notes'), 'dist/images');
copyImages(resolve('attachments'), 'dist/images');

// 运行 Pagefind
const cmd = 'npx pagefind --site dist --force-language zh';
console.log(`Running: ${cmd}`);
execSync(cmd, { stdio: 'inherit' });
