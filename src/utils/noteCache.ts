import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CACHE_PATH = resolve('.astro/note-cache.json');

interface CacheEntry {
  hash: string;
  mtimeMs: number;
}

export interface NoteCacheData {
  [relativePath: string]: CacheEntry;
}

function hashFile(filePath: string): { hash: string; mtimeMs: number } {
  const stat = statSync(filePath);
  const content = readFileSync(filePath);
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
  return { hash, mtimeMs: stat.mtimeMs };
}

export function loadCache(): NoteCacheData {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveCache(cache: NoteCacheData): void {
  const dir = resolve(CACHE_PATH, '..');
  if (!existsSync(dir)) {
    const { mkdirSync } = require('node:fs');
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

export function walkMdFiles(dir: string): { relativePath: string; absolutePath: string }[] {
  const results: { relativePath: string; absolutePath: string }[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        results.push({
          relativePath: fullPath.slice(dir.length + 1),
          absolutePath: fullPath,
        });
      }
    }
  }
  if (existsSync(dir)) walk(dir);
  return results;
}

export function diffNotes(
  currentFiles: { relativePath: string; absolutePath: string }[]
): { changed: string[]; unchanged: string[]; deleted: string[] } {
  const cache = loadCache();
  const currentPaths = new Set(currentFiles.map(f => f.relativePath));
  const changed: string[] = [];
  const unchanged: string[] = [];
  const deleted: string[] = [];

  for (const file of currentFiles) {
    const cached = cache[file.relativePath];
    if (!cached) {
      changed.push(file.relativePath);
      continue;
    }
    const { hash } = hashFile(file.absolutePath);
    if (hash === cached.hash) {
      unchanged.push(file.relativePath);
    } else {
      changed.push(file.relativePath);
    }
  }

  for (const cachedPath of Object.keys(cache)) {
    if (!currentPaths.has(cachedPath)) {
      deleted.push(cachedPath);
    }
  }

  return { changed, unchanged, deleted };
}

export function updateCache(
  currentFiles: { relativePath: string; absolutePath: string }[]
): void {
  const cache = loadCache();
  for (const file of currentFiles) {
    const { hash, mtimeMs } = hashFile(file.absolutePath);
    cache[file.relativePath] = { hash, mtimeMs };
  }
  const currentPaths = new Set(currentFiles.map(f => f.relativePath));
  for (const key of Object.keys(cache)) {
    if (!currentPaths.has(key)) delete cache[key];
  }
  saveCache(cache);
}
