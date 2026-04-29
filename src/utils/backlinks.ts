import type { CollectionEntry } from 'astro:content';

export interface BacklinkEntry {
  slug: string;
  title: string;
}

function resolveLink(
  raw: string,
  sourceId: string,
  byPath: Map<string, { id: string }>,
  byName: Map<string, { id: string }[]>,
): string | null {
  // 去括号，剥离别名（|）和标题锚点（#）
  const targetName = raw.replace(/[\[\]]/g, '').split('|')[0].split('#')[0];
  if (!targetName) return null;
  // 标准化：空格变短横线、全小写（与 Astro glob loader 一致）
  const normalized = targetName.replace(/ /g, '-').toLowerCase();
  // 去点号（Astro glob loader 会去掉路径中的点，如 v1.0 → v10、P.A.R.A. → PARA）
  const dotless = normalized.replace(/\./g, '');

  let targetId = byPath.get(normalized)?.id || byPath.get(dotless)?.id;

  if (!targetId) {
    const candidates = byName.get(normalized) || byName.get(dotless);
    if (candidates) {
      if (candidates.length === 1) {
        targetId = candidates[0].id;
      } else {
        const currentDir = sourceId.split('/').slice(0, -1).join('/');
        const sameGroup = candidates.find(c => c.id.startsWith(currentDir + '/'));
        targetId = sameGroup ? sameGroup.id : candidates[0].id;
      }
    }
  }

  return targetId || null;
}

/**
 * Single-pass O(n) backlink index builder.
 * Returns Map<targetId, BacklinkEntry[]> — every note's incoming links.
 */
export function buildBacklinkIndex(
  allNotes: CollectionEntry<'notes'>[],
  byPath: Map<string, { id: string }>,
  byName: Map<string, { id: string }[]>,
): Map<string, BacklinkEntry[]> {
  const index = new Map<string, BacklinkEntry[]>();

  for (const note of allNotes) {
    const matches = note.body?.match(/\[\[(.*?)\]\]/g);
    if (!matches) continue;

    const seen = new Set<string>();

    for (const link of matches) {
      const targetId = resolveLink(link, note.id, byPath, byName);
      if (!targetId) continue;

      if (!seen.has(targetId)) {
        seen.add(targetId);
        let list = index.get(targetId);
        if (!list) {
          list = [];
          index.set(targetId, list);
        }
        list.push({ slug: note.id, title: note.data.title || note.id.split('/').pop() || note.id });
      }
    }
  }

  return index;
}
