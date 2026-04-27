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
  const targetName = raw.replace(/[\[\]]/g, '').split('|')[0];

  let targetId = byPath.get(targetName.toLowerCase())?.id;

  if (!targetId) {
    const candidates = byName.get(targetName.toLowerCase());
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
        list.push({ slug: note.id, title: note.data.title });
      }
    }
  }

  return index;
}
