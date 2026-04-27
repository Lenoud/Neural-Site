import type { CollectionEntry } from 'astro:content';

export interface NavItem {
  name: string;
  slug?: string;
  order?: number;
  children?: NavItem[];
}

export function buildNavTree(notes: CollectionEntry<'notes'>[]): NavItem[] {
  const tree: Map<string, NavItem> = new Map();

  for (const note of notes) {
    const parts = note.id.split('/');
    const category = parts[0];

    if (!tree.has(category)) {
      tree.set(category, { name: category, children: [] });
    }

    const node = tree.get(category)!;
    node.children!.push({
      name: note.data.title,
      slug: note.id,
      order: note.data.order,
    });
  }

  for (const node of tree.values()) {
    node.children!.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }

  return Array.from(tree.values());
}
