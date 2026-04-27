import type { CollectionEntry } from 'astro:content';

export function buildBacklinks(
  allNotes: CollectionEntry<'notes'>[],
  currentId: string,
  byPath: Map<string, { id: string }>,
  byName: Map<string, { id: string }[]>,
): { slug: string; title: string }[] {
  const results: { slug: string; title: string }[] = [];

  for (const note of allNotes) {
    if (note.id === currentId) continue;
    const matches = note.body?.match(/\[\[(.*?)\]\]/g);
    if (!matches) continue;

    for (const link of matches) {
      const targetName = link.replace(/[\[\]]/g, '').split('|')[0];

      // 路径精确匹配
      let targetId = byPath.get(targetName.toLowerCase())?.id;

      // 文件名匹配
      if (!targetId) {
        const candidates = byName.get(targetName.toLowerCase());
        if (candidates) {
          if (candidates.length === 1) {
            targetId = candidates[0].id;
          } else {
            // 同组优先
            const currentDir = note.id.split('/').slice(0, -1).join('/');
            const sameGroup = candidates.find(c => c.id.startsWith(currentDir + '/'));
            targetId = sameGroup ? sameGroup.id : candidates[0].id;
          }
        }
      }

      if (targetId === currentId) {
        results.push({ slug: note.id, title: note.data.title });
        break;
      }
    }
  }

  return results;
}
