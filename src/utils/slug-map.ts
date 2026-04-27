import { getCollection } from 'astro:content';

export interface SlugEntry {
  id: string;          // Astro 实际 id（小写路径）
  fileName: string;    // 原始文件名
  fullPath: string;    // 原始完整路径
}

/**
 * 构建 slug 索引，支持三种匹配模式（与 Obsidian 一致）：
 * 1. 路径精确匹配：[[前端组/技术文档/API规范]]
 * 2. 文件名唯一时直接匹配：[[快速开始]]
 * 3. 文件名重复时需用路径消歧
 */
export async function buildSlugIndex(): Promise<{
  byPath: Map<string, SlugEntry>;
  byName: Map<string, SlugEntry[]>;
}> {
  const notes = await getCollection('notes');
  const byPath = new Map<string, SlugEntry>();
  const byName = new Map<string, SlugEntry[]>();

  for (const note of notes) {
    // Astro glob loader 将 id 转小写
    // 从 id 还原：技术文档/api规范 → 需要从文件系统获取原始大小写
    const entry: SlugEntry = {
      id: note.id,
      fileName: '',
      fullPath: '',
    };

    // id 格式: 前端组/技术文档/前端规范 (已小写)
    const parts = note.id.split('/');
    entry.fileName = parts[parts.length - 1];
    entry.fullPath = note.id;

    // 按完整路径索引（原始 + 小写 都存）
    byPath.set(note.id, entry);
    byPath.set(entry.fileName, entry);

    // 按文件名索引（一个文件名可能对应多个文档）
    const list = byName.get(entry.fileName) || [];
    list.push(entry);
    byName.set(entry.fileName, list);
  }

  return { byPath, byName };
}

/**
 * 解析 wikilink 目标，返回 Astro id
 * 匹配优先级：完整路径 > 文件名（唯一时）
 * currentPath 用于同组优先消歧
 */
export function resolveWikilink(
  target: string,
  byPath: Map<string, SlugEntry>,
  byName: Map<string, SlugEntry[]>,
  currentPath?: string,
): string | null {
  // 1. 精确路径匹配
  const pathMatch = byPath.get(target.toLowerCase());
  if (pathMatch) return pathMatch.id;

  // 2. 文件名匹配
  const candidates = byName.get(target.toLowerCase());
  if (!candidates || candidates.length === 0) return null;

  if (candidates.length === 1) return candidates[0].id;

  // 3. 多个同名文件：同组优先
  if (currentPath) {
    const currentDir = currentPath.split('/').slice(0, -1).join('/');
    const sameGroup = candidates.find(c => c.id.startsWith(currentDir + '/'));
    if (sameGroup) return sameGroup.id;
  }

  // 4. 兜底：返回第一个
  return candidates[0].id;
}
