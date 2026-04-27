import type { CollectionEntry } from 'astro:content';

export function buildBacklinks(
  allNotes: CollectionEntry<'notes'>[],
  currentId: string,
  slugMap: Map<string, string>
): { slug: string; title: string }[] {
  const results: { slug: string; title: string }[] = [];

  for (const note of allNotes) {
    if (note.id === currentId) continue;
    const matches = note.body?.match(/\[\[(.*?)\]\]/g);
    if (!matches) continue;

    for (const link of matches) {
      const targetName = link.replace(/[\[\]]/g, '').split('|')[0];
      const targetSlug = slugMap.get(targetName);
      if (targetSlug === currentId) {
        results.push({ slug: note.id, title: note.data.title });
        break;
      }
    }
  }

  return results;
}
