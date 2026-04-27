import { getCollection } from 'astro:content';
import { buildSlugIndex } from './slug-map';
import { buildBacklinkIndex, type BacklinkEntry } from './backlinks';

let cached: Map<string, BacklinkEntry[]> | null = null;

export async function getBacklinkIndex(): Promise<Map<string, BacklinkEntry[]>> {
  if (!cached) {
    const allNotes = await getCollection('notes');
    const { byPath, byName } = await buildSlugIndex();
    cached = buildBacklinkIndex(allNotes, byPath, byName);
  }
  return cached;
}
