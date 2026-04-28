import { readFileSync, existsSync, cpSync, rmSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '..');
const CONFIG_PATH = join(ROOT, 'content-repos.json');
const CACHE_DIR = join(ROOT, '.astro', 'content-cache');
const NOTES_DIR = join(ROOT, 'src', 'content', 'notes');

// 这些目录的内容不会被同步
const IGNORE_DIRS = new Set(['.git', '.obsidian', '.gitlab', '.github', 'node_modules', '.trash']);

function readConfig() {
  if (!existsSync(CONFIG_PATH)) {
    console.log('No content-repos.json found, skipping sync.');
    return [];
  }
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')).repos || [];
}

function sh(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function cloneOrPull(url, branch, cachePath) {
  if (existsSync(join(cachePath, '.git'))) {
    console.log(`  Pulling ${url} ...`);
    sh(`git -C "${cachePath}" fetch origin ${branch}`);
    sh(`git -C "${cachePath}" checkout origin/${branch} --force`);
  } else {
    console.log(`  Cloning ${url} ...`);
    if (existsSync(cachePath)) rmSync(cachePath, { recursive: true });
    mkdirSync(cachePath, { recursive: true });
    sh(`git clone --depth 1 --branch ${branch} "${url}" "${cachePath}"`);
  }
}

function copyContent(cachePath, targetDir) {
  const target = join(NOTES_DIR, targetDir);
  // 清空目标目录再写入，避免残留旧文件
  if (existsSync(target)) rmSync(target, { recursive: true });
  mkdirSync(target, { recursive: true });

  let count = 0;
  function walk(src, dest) {
    for (const entry of readdirSync(src, { withFileTypes: true })) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);
      if (entry.isDirectory()) {
        mkdirSync(destPath, { recursive: true });
        walk(srcPath, destPath);
      } else if (entry.name.endsWith('.md') || isImage(entry.name)) {
        cpSync(srcPath, destPath);
        count++;
      }
    }
  }
  walk(cachePath, target);
  console.log(`  Copied ${count} files to src/content/notes/${targetDir}/`);
}

function isImage(name) {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.ico'].includes(ext);
}

// --- main ---
const repos = readConfig();
if (repos.length === 0) process.exit(0);

console.log('Syncing external content repos...');
mkdirSync(CACHE_DIR, { recursive: true });

for (const repo of repos) {
  console.log(`\n[${repo.dir}]`);
  const cachePath = join(CACHE_DIR, repo.dir);
  try {
    cloneOrPull(repo.url, repo.branch || 'main', cachePath);
    copyContent(cachePath, repo.dir);
  } catch (err) {
    console.error(`  ERROR: Failed to sync ${repo.dir}: ${err.message}`);
    process.exit(1);
  }
}

console.log('\nSync complete.');
