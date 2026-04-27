import type { CollectionEntry } from 'astro:content';

export interface NavItem {
  name: string;
  slug?: string;
  order?: number;
  children?: NavItem[];
}

function ensureChild(children: NavItem[], name: string): NavItem {
  let item = children.find(c => c.name === name && !c.slug);
  if (!item) {
    item = { name, children: [] };
    children.push(item);
  }
  return item;
}

function sortChildren(items: NavItem[]) {
  items.sort((a, b) => {
    // 目录排前面，文件排后面
    const aIsDir = !!a.children;
    const bIsDir = !!b.children;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;

    if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });

  for (const item of items) {
    if (item.children) sortChildren(item.children);
  }
}

export function buildNavTree(notes: CollectionEntry<'notes'>[]): NavItem[] {
  const root: NavItem[] = [];

  for (const note of notes) {
    const parts = note.id.split('/');
    // parts: ["前端组", "技术文档", "api规范"]
    // 最后一段是文件，前面都是目录
    const dirs = parts.slice(0, -1);

    let current = root;
    for (const dir of dirs) {
      const item = ensureChild(current, dir);
      current = item.children!;
    }

    current.push({
      name: note.data.title,
      slug: note.id,
      order: note.data.order,
    });
  }

  sortChildren(root);
  return root;
}
