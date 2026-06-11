import { getCollection } from 'astro:content';
import { buildSlugIndex, resolveWikilink } from './slug-map';
import { stripNonContent } from './backlinks';

export interface LinkGraph {
  allLinks: { source: string; target: string }[];
  neighborMap: Map<string, Set<string>>;
}

// SSG-only: module-level cache, never invalidated (safe because each build is a fresh process)
let cached: LinkGraph | null = null;

/**
 * 全站链接图（wikilink + 标准 md 链接），整个构建只扫描一次。
 * 每个笔记页面的局部图谱基于 neighborMap 做 BFS。
 */
export async function getLinkGraph(): Promise<LinkGraph> {
  if (cached) return cached;

  const allNotes = await getCollection('notes');
  const { byPath, byName } = await buildSlugIndex();

  const forwardMap = new Map<string, Set<string>>();
  const allLinks: { source: string; target: string }[] = [];

  function addLink(srcId: string, targetId: string) {
    let set = forwardMap.get(srcId);
    if (!set) { set = new Set(); forwardMap.set(srcId, set); }
    if (!set.has(targetId)) {
      set.add(targetId);
      allLinks.push({ source: srcId, target: targetId });
    }
  }

  for (const src of allNotes) {
    if (!src.body) continue;
    const body = stripNonContent(src.body);

    const wikiMatches = body.match(/\[\[(.*?)\]\]/g);
    if (wikiMatches) {
      for (const link of wikiMatches) {
        const targetName = link.replace(/[\[\]]/g, '').split('|')[0].split('#')[0];
        if (!targetName) continue;
        const targetId = resolveWikilink(targetName, byPath, byName, src.id);
        if (targetId && targetId !== src.id) addLink(src.id, targetId);
      }
    }

    const mdMatches = body.match(/\[([^\]]*)\]\(([^)]+\.md)\)/g);
    if (mdMatches) {
      for (const link of mdMatches) {
        const urlMatch = link.match(/\]\(([^)]+\.md)\)/);
        if (!urlMatch) continue;
        let rawTarget = urlMatch[1];
        try { rawTarget = decodeURIComponent(rawTarget); } catch { /* 非法编码序列，按原值处理 */ }
        rawTarget = rawTarget.replace(/\.md$/, '');
        const targetId = resolveWikilink(rawTarget, byPath, byName, src.id);
        if (targetId && targetId !== src.id) addLink(src.id, targetId);
      }
    }
  }

  const neighborMap = new Map<string, Set<string>>();
  for (const [src, targets] of forwardMap) {
    if (!neighborMap.has(src)) neighborMap.set(src, new Set());
    for (const t of targets) {
      neighborMap.get(src)!.add(t);
      if (!neighborMap.has(t)) neighborMap.set(t, new Set());
      neighborMap.get(t)!.add(src);
    }
  }

  cached = { allLinks, neighborMap };
  return cached;
}
