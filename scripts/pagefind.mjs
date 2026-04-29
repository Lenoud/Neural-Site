import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join, extname, relative } from 'node:path';
import sharp from 'sharp';

// 复制图片到 dist/images/
const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico']);
const convertibleExts = new Set(['.png', '.jpg', '.jpeg']);

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

// 图片优化：生成 WebP
const MAX_WIDTH = 1400;
const WEBP_QUALITY = 80;

async function optimizeImages(imagesDir) {
  console.log('\nOptimizing images (WebP)...');
  const files = execSync(`find "${imagesDir}" -type f`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  let converted = 0;
  let skipped = 0;

  for (const fullPath of files) {
    const ext = extname(fullPath).toLowerCase();
    if (!convertibleExts.has(ext)) continue;

    const webpPath = fullPath.slice(0, -ext.length) + '.webp';
    if (existsSync(webpPath)) { skipped++; continue; }

    try {
      await sharp(fullPath)
        .resize(MAX_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(webpPath);

      const origSize = statSync(fullPath).size;
      const webpSize = statSync(webpPath).size;
      const saving = Math.round((1 - webpSize / origSize) * 100);
      console.log(`  WebP: ${relative(imagesDir, webpPath)} (${saving}% smaller)`);
      converted++;
    } catch (e) {
      console.warn(`  Skip: ${relative(imagesDir, fullPath)} — ${e.message}`);
    }
  }
  console.log(`  Converted: ${converted}, Skipped: ${skipped}`);
}

await optimizeImages('dist/images');

// HTML 替换：<img> → <picture> with WebP source
function injectPictureElements(distDir) {
  console.log('\nInjecting <picture> elements...');
  const htmlFiles = execSync(`find "${distDir}" -name "*.html" -type f`, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
  let replaced = 0;

  for (const htmlFile of htmlFiles) {
    let html = readFileSync(htmlFile, 'utf-8');
    const imgRegex = /<img\s([^>]*?)src="([^"]+\.(png|jpg|jpeg))"([^>]*?)>/gi;
    let changed = false;

    html = html.replace(imgRegex, (match, before, src, ext, after) => {
      const localPath = join(distDir, src.replace(/^\//, ''));
      const webpLocalPath = localPath.slice(0, -ext.length - 1) + '.webp';

      if (!existsSync(webpLocalPath)) return match;

      const webpSrc = encodeURI(src.slice(0, -(ext.length + 1)) + '.webp');
      changed = true;
      replaced++;
      return `<picture><source srcset="${webpSrc}" type="image/webp"><img ${before}src="${src}"${after}></picture>`;
    });

    if (changed) {
      writeFileSync(htmlFile, html);
    }
  }
  console.log(`  Replaced: ${replaced} <img> tags`);
}

injectPictureElements('dist');

// 运行 Pagefind
const cmd = 'npx pagefind --site dist --force-language zh';
console.log(`\nRunning: ${cmd}`);
execSync(cmd, { stdio: 'inherit' });
