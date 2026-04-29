import type { CollectionEntry } from 'astro:content';
import { resolveWikilink, type SlugEntry } from './slug-map';

export interface BacklinkEntry {
  slug: string;
  title: string;
}

/**
 * Single-pass O(n) backlink index builder.
 * Returns Map<targetId, BacklinkEntry[]> — every note's incoming links.
 */
export function buildBacklinkIndex(
  allNotes: CollectionEntry<'notes'>[],
  byPath: Map<string, SlugEntry>,
  byName: Map<string, SlugEntry[]>,
): Map<string, BacklinkEntry[]> {
  const index = new Map<string, BacklinkEntry[]>();

  for (const note of allNotes) {
    const matches = note.body?.match(/\[\[(.*?)\]\]/g);
    if (!matches) continue;

    const seen = new Set<string>();

    for (const link of matches) {
      const target = link.replace(/[\[\]]/g, '').split('|')[0].split('#')[0];
      if (!target) continue;

      const targetId = resolveWikilink(target, byPath, byName, note.id);
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
