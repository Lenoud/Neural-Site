import { getCollection } from 'astro:content';

export async function buildSlugMap(): Promise<Map<string, string>> {
  const notes = await getCollection('notes');
  const map = new Map<string, string>();
  for (const note of notes) {
    const fileName = note.id.split('/').pop()!;
    map.set(fileName, note.id);
    // Astro glob loader 会将 id 转小写，同时用原始文件名索引
    // 这样 [[API规范]] 和 [[api规范]] 都能匹配
    map.set(fileName.toLowerCase(), note.id);
  }
  return map;
}
