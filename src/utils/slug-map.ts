import { getCollection } from 'astro:content';

export async function buildSlugMap(): Promise<Map<string, string>> {
  const notes = await getCollection('notes');
  const map = new Map<string, string>();
  for (const note of notes) {
    // Astro 6 glob loader: id = 相对路径去掉 .md（等同旧版 slug）
    const fileName = note.id.split('/').pop()!;
    map.set(fileName, note.id);
  }
  return map;
}
