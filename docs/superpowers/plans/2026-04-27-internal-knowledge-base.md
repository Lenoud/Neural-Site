# 内部知识库实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 short-star 项目基础上，构建 Obsidian Publish 风格的内部知识库，支持文档浏览、双向链接、图谱可视化、全文搜索，通过 GitLab CI 部署到内部 Nginx。

**Architecture:** Astro 6 静态站点，Markdown 文件通过 glob loader 加载，自定义 remark 插件处理 `[[wikilinks]]`，构建时生成 slug map 和反向链接索引。三栏布局：左侧文件树导航 + 中间文档内容 + 右侧图谱/目录/反链。

**Tech Stack:** Astro 6, force-graph, Pagefind, TypeScript, GitLab CI, Nginx

**Spec:** `docs/superpowers/specs/2026-04-27-internal-knowledge-base-design.md`

---

## File Structure

```
src/
├── plugins/
│   └── remark-wikilinks.ts        # 自定义 remark 插件：[[链接]] → <a>
├── utils/
│   ├── slug-map.ts                 # 构建时 slug map：文件名 → 完整 slug
│   ├── backlinks.ts                # 反向链接索引构建
│   └── nav-tree.ts                 # 从目录结构生成导航树
├── components/
│   ├── Sidebar.astro               # 左侧导航栏（搜索 + 文件树）
│   ├── NavTree.astro               # 递归树形导航
│   ├── RightPanel.astro            # 右侧面板容器
│   ├── LocalGraph.astro            # 局部图谱组件（force-graph）
│   ├── OnThisPage.astro            # 页内目录（h2/h3 提取）
│   ├── Backlinks.astro             # 反向链接列表
│   ├── SearchDialog.astro          # Pagefind 搜索弹窗
│   └── PageLayout.astro            # 三栏布局容器（替代 Layout.astro）
├── content/
│   └── notes/                      # Markdown 文档（按目录分类）
│       ├── 入门/
│       ├── 技术文档/
│       ├── 流程规范/
│       ├── 会议记录/
│       └── 故障复盘/
├── content.config.ts               # 更新 schema：title 必填 + tags + order
├── layouts/
│   └── Layout.astro                # 保留，基础 HTML 外壳
├── pages/
│   ├── index.astro                 # 首页（重定向到欢迎文档）
│   ├── notes/
│   │   └── [...slug].astro         # 动态路由，渲染所有笔记
│   └── graph.astro                 # 全局图谱页面
└── styles/
    └── global.css                  # 全局样式（深色主题）
```

---

## Task 1: 基础样式与布局框架

**Files:**
- Create: `src/styles/global.css`
- Modify: `src/layouts/Layout.astro`
- Create: `src/components/PageLayout.astro`

- [ ] **Step 1: 创建全局 CSS（深色主题 + 三栏布局）**

Create `src/styles/global.css`:

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg-primary: #1e1e1e;
  --bg-sidebar: #252525;
  --bg-hover: #333333;
  --text-primary: #ffffff;
  --text-secondary: #cccccc;
  --text-muted: #888888;
  --border-color: #333333;
  --accent: #6ab0e6;
  --sidebar-width: 240px;
  --right-panel-width: 280px;
}

html, body {
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-family: -apple-system, "Microsoft YaHei", "Segoe UI", sans-serif;
  font-size: 15px;
  line-height: 1.7;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.page-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 40px 48px;
  max-width: 800px;
}

.right-panel {
  width: var(--right-panel-width);
  min-width: var(--right-panel-width);
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
  padding: 20px;
}

/* Markdown 渲染样式 */
.content-area h1 { color: var(--text-primary); font-size: 2em; margin-bottom: 16px; }
.content-area h2 { color: var(--text-primary); font-size: 1.5em; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); }
.content-area h3 { color: var(--text-primary); font-size: 1.2em; margin: 24px 0 8px; }
.content-area p { margin-bottom: 16px; }
.content-area ul, .content-area ol { margin-bottom: 16px; padding-left: 24px; }
.content-area code { background: var(--bg-hover); padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
.content-area pre { background: var(--bg-hover); padding: 16px; border-radius: 6px; overflow-x: auto; margin-bottom: 16px; }
.content-area pre code { background: none; padding: 0; }
.content-area blockquote { border-left: 3px solid var(--accent); padding-left: 16px; color: var(--text-muted); margin-bottom: 16px; }

/* wikilink 样式 */
.wikilink-broken { color: var(--text-muted); border-bottom: 1px dashed var(--text-muted); cursor: not-allowed; }

/* 右侧面板区块 */
.right-panel section { margin-bottom: 24px; }
.right-panel h4 { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
```

- [ ] **Step 2: 更新 Layout.astro 为基础 HTML 外壳**

Modify `src/layouts/Layout.astro`:

```astro
---
interface Props {
  title: string;
}
const { title } = Astro.props;
---
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title} - 知识库</title>
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  @import '../styles/global.css';
</style>
```

- [ ] **Step 3: 创建 PageLayout 三栏布局组件**

Create `src/components/PageLayout.astro`:

```astro
---
import Sidebar from './Sidebar.astro';
import RightPanel from './RightPanel.astro';

interface Props {
  title: string;
  currentSlug?: string;
  headings?: { depth: number; slug: string; text: string }[];
  backlinks?: { slug: string; title: string }[];
  graphData?: object;
  currentId?: string;
}
const { title, currentSlug, headings = [], backlinks = [], graphData, currentId } = Astro.props;
---
<div class="page-layout">
  <aside class="sidebar" data-current={currentSlug}>
    <Sidebar currentSlug={currentSlug} />
  </aside>
  <main class="content-area">
    <slot />
  </main>
  <aside class="right-panel">
    <RightPanel
      headings={headings}
      backlinks={backlinks}
      graphData={graphData}
      currentId={currentId}
    />
  </aside>
</div>
```

- [ ] **Step 4: 验证布局**

Run: `npm run dev`

打开浏览器确认三栏布局正确显示（即使内容为空），侧栏深灰色背景。

- [ ] **Step 5: 提交**

```bash
git add src/styles/global.css src/layouts/Layout.astro src/components/PageLayout.astro
git commit -m "feat: add dark theme and three-column layout"
```

---

## Task 2: 内容集合与示例文档

**Files:**
- Modify: `src/content.config.ts`
- Create: 8 个示例 Markdown 文件
- Delete: `src/content/notes/欢迎.md`, `src/content/notes/创建链接.md`

- [ ] **Step 1: 更新 content.config.ts schema**

Modify `src/content.config.ts`:

```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()).optional(),
    order: z.number().optional(),
  }),
});

export const collections = { notes };
```

- [ ] **Step 2: 删除旧示例文档**

```bash
rm src/content/notes/欢迎.md src/content/notes/创建链接.md
```

- [ ] **Step 3: 创建目录结构和示例文档**

```bash
mkdir -p src/content/notes/{入门,技术文档,流程规范,会议记录,故障复盘}
```

Create `src/content/notes/入门/快速开始.md`:

```markdown
---
title: 快速开始
order: 1
---
# 快速开始

欢迎使用团队知识库。

## 如何写文档

1. 在对应目录下创建 `.md` 文件
2. 添加 frontmatter（title 必填）
3. 使用 [[链接]] 引用其他文档
4. Git push 后自动构建部署

## 约定

- 文件名必须全局唯一
- 参考 [[代码规范]] 了解编码标准
- 参考 [[发布流程]] 了解部署流程
```

Create `src/content/notes/入门/安装部署.md`:

```markdown
---
title: 安装部署
order: 2
---
# 安装部署

## 本地开发

```bash
npm install
npm run dev
```

## 构建部署

```bash
npm run build
```

构建产物在 `dist/` 目录，通过 CI 自动推送到 Nginx 服务器。

参见 [[架构设计]] 了解系统架构。
```

Create `src/content/notes/技术文档/API规范.md`:

```markdown
---
title: API规范
order: 1
tags: [API, 规范]
---
# API 规范

## RESTful 接口设计

- URL 使用小写 + 连字符
- 使用 HTTP 方法表达操作（GET/POST/PUT/DELETE）
- 响应格式统一使用 JSON

## 错误处理

所有接口返回统一的错误格式：

```json
{
  "code": "ERROR_CODE",
  "message": "错误描述"
}
```

相关文档：[[架构设计]]、[[代码规范]]
```

Create `src/content/notes/技术文档/架构设计.md`:

```markdown
---
title: 架构设计
order: 2
tags: [架构]
---
# 架构设计

## 系统概览

整体采用前后端分离架构。

## 技术选型

- 前端：React + TypeScript
- 后端：Go + gRPC
- 数据库：PostgreSQL
- 缓存：Redis

参见 [[API规范]] 了解接口约定。
```

Create `src/content/notes/流程规范/代码规范.md`:

```markdown
---
title: 代码规范
order: 1
tags: [规范, 代码]
---
# 代码规范

## Git 提交规范

提交信息格式：`type(scope): description`

- feat: 新功能
- fix: 修复
- docs: 文档
- refactor: 重构

## 代码审查

所有代码合并前需要至少一人审查。

参见 [[发布流程]] 了解合并后的流程。
```

Create `src/content/notes/流程规范/发布流程.md`:

```markdown
---
title: 发布流程
order: 2
tags: [规范, 发布]
---
# 发布流程

## 发布步骤

1. 确认 [[代码规范]] 审查通过
2. 合并到 main 分支
3. CI 自动构建并部署
4. 验证线上环境

## 回滚

如遇问题，通过 GitLab Revert 回退提交，CI 会自动重新部署。

参见 [[2024-03-服务宕机]] 了解历史故障案例。
```

Create `src/content/notes/会议记录/2024-04-技术评审.md`:

```markdown
---
title: 2024-04-技术评审
tags: [会议, 评审]
---
# 技术评审 - 2024年4月

## 参会人员

全体开发人员

## 议题

### 架构升级方案

讨论了 [[架构设计]] 中提出的技术选型变更。

### 代码规范更新

更新了 [[代码规范]] 中的 Git 提交规范。
```

Create `src/content/notes/故障复盘/2024-03-服务宕机.md`:

```markdown
---
title: 2024-03-服务宕机
tags: [故障, 复盘]
---
# 故障复盘 - 2024年3月服务宕机

## 故障概要

2024年3月某日，线上服务出现 30 分钟不可用。

## 根因分析

数据库连接池耗尽，导致新请求无法获取连接。

## 改进措施

1. 调整连接池参数
2. 添加连接池监控告警
3. 参考 [[发布流程]] 完善回滚机制
```

- [ ] **Step 4: 验证内容集合加载**

Run: `npm run dev`

在任意 Astro 页面的 frontmatter 中临时添加：

```typescript
const allNotes = await getCollection('notes');
console.log(allNotes.map(n => ({ slug: n.slug, title: n.data.title })));
```

确认控制台输出 8 条记录，slug 格式为 `入门/快速开始` 等。

- [ ] **Step 5: 提交**

```bash
git add -A src/content/
git commit -m "feat: add content schema and sample documents"
```

---

## Task 3: remark-wikilinks 插件

**Files:**
- Create: `src/plugins/remark-wikilinks.ts`
- Modify: `astro.config.mjs`

- [ ] **Step 1: 创建 slug map 工具函数**

Create `src/utils/slug-map.ts`:

```typescript
import { getCollection } from 'astro:content';

export async function buildSlugMap(): Promise<Map<string, string>> {
  const notes = await getCollection('notes');
  const map = new Map<string, string>();
  for (const note of notes) {
    // 从 slug 中提取文件名：入门/快速开始 → 快速开始
    const fileName = note.slug.split('/').pop()!;
    map.set(fileName, note.slug);
  }
  return map;
}
```

- [ ] **Step 2: 创建 remark-wikilinks 插件**

Create `src/plugins/remark-wikilinks.ts`:

```typescript
import { visit } from 'unist-util-visit';

export function remarkWikilinks(slugMap: Map<string, string>) {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;

      const regex = /\[\[(.*?)\]\]/g;
      const text = node.value;
      const parts: any[] = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        // match 前的普通文本
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const target = match[1].split('|')[0]; // 支持 [[target|alias]]
        const slug = slugMap.get(target);
        const alias = match[1].includes('|') ? match[1].split('|')[1] : target;

        if (slug) {
          parts.push({
            type: 'link',
            url: `/notes/${slug}`,
            children: [{ type: 'text', value: alias }],
          });
        } else {
          parts.push({
            type: 'html',
            value: `<span class="wikilink-broken" title="文档不存在: ${target}">${alias}</span>`,
          });
        }

        lastIndex = regex.lastIndex;
      }

      // 尾部剩余文本
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      // 只有匹配到 wikilink 时才替换节点
      if (parts.length > 0) {
        parent.children.splice(index, 1, ...parts);
      }
    });
  };
}
```

- [ ] **Step 3: 安装依赖并配置 Astro**

```bash
npm install unist-util-visit
npm install -D @types/unist-util-visit
```

Modify `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import { remarkWikilinks } from './src/plugins/remark-wikilinks';
import { buildSlugMap } from './src/utils/slug-map';

const slugMap = await buildSlugMap();

export default defineConfig({
  markdown: {
    remarkPlugins: [[remarkWikilinks, slugMap]],
  },
});
```

- [ ] **Step 4: 验证 wikilink 渲染**

Run: `npm run dev`

创建一个临时测试页面，渲染包含 `[[代码规范]]` 的 Markdown，确认输出为 `<a href="/notes/流程规范/代码规范">代码规范</a>`。

- [ ] **Step 5: 提交**

```bash
git add src/plugins/ src/utils/slug-map.ts astro.config.mjs package.json package-lock.json
git commit -m "feat: add remark-wikilinks plugin for [[link]] syntax"
```

---

## Task 4: 笔记详情页与动态路由

**Files:**
- Create: `src/pages/notes/[...slug].astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: 创建笔记详情页**

Create `src/pages/notes/[...slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import PageLayout from '../../components/PageLayout.astro';
import { buildSlugMap } from '../../utils/slug-map';
import { buildBacklinks } from '../../utils/backlinks';

export async function getStaticPaths() {
  const notes = await getCollection('notes');
  return notes.map(note => ({
    params: { slug: note.slug },
    props: { note },
  }));
}

const { note } = Astro.props;
const { Content } = await note.render();

// 构建图谱数据
const slugMap = await buildSlugMap();
const allNotes = await getCollection('notes');
const existingSlugs = new Set(allNotes.map(n => n.slug));

const nodes = [{ id: note.slug, name: note.data.title }];
const links: { source: string; target: string }[] = [];

const matches = note.body.match(/\[\[(.*?)\]\]/g);
if (matches) {
  for (const link of matches) {
    const targetName = link.replace(/[\[\]]/g, '').split('|')[0];
    const targetSlug = slugMap.get(targetName);
    if (targetSlug) {
      if (!nodes.find(n => n.id === targetSlug)) {
        const targetNote = allNotes.find(n => n.slug === targetSlug);
        nodes.push({ id: targetSlug, name: targetNote?.data.title || targetName });
      }
      links.push({ source: note.slug, target: targetSlug });
    }
  }
}

// 构建反向链接
const backlinks = buildBacklinks(allNotes, note.slug, slugMap);

// 获取 headings（从渲染后的 HTML 提取）
const headings = note.headings
  ?.filter((h: any) => h.depth === 2 || h.depth === 3)
  .map((h: any) => ({ depth: h.depth, slug: h.slug, text: h.text })) || [];

const graphData = { nodes, links };
---

<Layout title={note.data.title}>
  <PageLayout
    title={note.data.title}
    currentSlug={note.slug}
    headings={headings}
    backlinks={backlinks}
    graphData={graphData}
    currentId={note.slug}
  >
    <Content />
  </PageLayout>
</Layout>
```

- [ ] **Step 2: 创建反向链接工具函数**

Create `src/utils/backlinks.ts`:

```typescript
import type { CollectionEntry } from 'astro:content';

export function buildBacklinks(
  allNotes: CollectionEntry<'notes'>[],
  currentSlug: string,
  slugMap: Map<string, string>
): { slug: string; title: string }[] {
  const results: { slug: string; title: string }[] = [];

  for (const note of allNotes) {
    if (note.slug === currentSlug) continue;
    const matches = note.body.match(/\[\[(.*?)\]\]/g);
    if (!matches) continue;

    for (const link of matches) {
      const targetName = link.replace(/[\[\]]/g, '').split('|')[0];
      const targetSlug = slugMap.get(targetName);
      if (targetSlug === currentSlug) {
        results.push({ slug: note.slug, title: note.data.title });
        break;
      }
    }
  }

  return results;
}
```

- [ ] **Step 3: 更新首页为重定向**

Modify `src/pages/index.astro` — 替换全部内容：

```astro
---
return Astro.redirect('/notes/入门/快速开始');
---
```

- [ ] **Step 4: 验证动态路由**

Run: `npm run dev`

访问 `http://localhost:4321/`，确认重定向到 `/notes/入门/快速开始`，文档内容正确渲染，`[[链接]]` 变为可点击链接。

- [ ] **Step 5: 提交**

```bash
git add src/pages/ src/utils/backlinks.ts
git commit -m "feat: add note detail page with dynamic routing and backlinks"
```

---

## Task 5: 左侧导航栏

**Files:**
- Create: `src/utils/nav-tree.ts`
- Create: `src/components/NavTree.astro`
- Create: `src/components/Sidebar.astro`

- [ ] **Step 1: 创建导航树工具函数**

Create `src/utils/nav-tree.ts`:

```typescript
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
    const parts = note.slug.split('/');
    const category = parts[0];

    if (!tree.has(category)) {
      tree.set(category, { name: category, children: [] });
    }

    const node = tree.get(category)!;
    node.children!.push({
      name: note.data.title,
      slug: note.slug,
      order: note.data.order,
    });
  }

  // 按 order 排序，无 order 按名称排
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
```

- [ ] **Step 2: 创建 NavTree 组件**

Create `src/components/NavTree.astro`:

```astro
---
interface NavItem {
  name: string;
  slug?: string;
  order?: number;
  children?: NavItem[];
}

interface Props {
  items: NavItem[];
  currentSlug?: string;
  depth?: number;
}

const { items, currentSlug = '', depth = 0 } = Astro.props;
---

<ul class="nav-list" style={`padding-left: ${depth * 12}px`}>
  {items.map(item => (
    <li>
      {item.slug ? (
        <a
          href={`/notes/${item.slug}`}
          class:list={['nav-link', { active: item.slug === currentSlug }]}
        >
          {item.name}
        </a>
      ) : (
        <details open={item.children?.some(c => c.slug === currentSlug)}>
          <summary class="nav-category">{item.name}</summary>
          {item.children && <NavTree items={item.children} currentSlug={currentSlug} depth={depth + 1} />}
        </details>
      )}
    </li>
  ))}
</ul>

<style>
  .nav-list { list-style: none; }
  .nav-link {
    display: block;
    padding: 6px 12px;
    color: var(--text-secondary);
    border-radius: 4px;
    transition: background 0.15s;
  }
  .nav-link:hover { background: var(--bg-hover); color: var(--text-primary); }
  .nav-link.active { background: var(--bg-hover); color: var(--text-primary); }
  .nav-category {
    padding: 8px 12px;
    color: var(--text-muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
  }
  details > summary { list-style: none; }
  details > summary::before { content: '▶ '; font-size: 10px; }
  details[open] > summary::before { content: '▼ '; }
</style>
```

- [ ] **Step 3: 创建 Sidebar 组件**

Create `src/components/Sidebar.astro`:

```astro
---
import { getCollection } from 'astro:content';
import { buildNavTree } from '../utils/nav-tree';
import NavTree from './NavTree.astro';

interface Props {
  currentSlug?: string;
}

const { currentSlug } = Astro.props;
const allNotes = await getCollection('notes');
const tree = buildNavTree(allNotes);
---

<div class="sidebar-inner">
  <div class="sidebar-header">
    <a href="/" class="logo">知识库</a>
  </div>
  <div class="sidebar-search">
    <button class="search-trigger" id="search-trigger">🔍 搜索文档...</button>
  </div>
  <nav class="sidebar-nav">
    <NavTree items={tree} currentSlug={currentSlug} />
  </nav>
</div>

<style>
  .sidebar-inner { padding: 16px 8px; height: 100%; }
  .sidebar-header { padding: 8px 12px; margin-bottom: 16px; }
  .logo { color: var(--text-primary); font-size: 18px; font-weight: 700; text-decoration: none; }
  .sidebar-search { padding: 0 8px; margin-bottom: 12px; }
  .search-trigger {
    width: 100%;
    padding: 8px 12px;
    background: var(--bg-hover);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    color: var(--text-muted);
    cursor: pointer;
    text-align: left;
    font-size: 13px;
  }
  .search-trigger:hover { border-color: var(--accent); }
  .sidebar-nav { flex: 1; overflow-y: auto; }
</style>
```

- [ ] **Step 4: 验证导航**

Run: `npm run dev`

确认左侧栏显示分类目录树，当前页面高亮，点击可跳转。

- [ ] **Step 5: 提交**

```bash
git add src/utils/nav-tree.ts src/components/NavTree.astro src/components/Sidebar.astro
git commit -m "feat: add sidebar navigation with auto-generated tree"
```

---

## Task 6: 右侧面板（图谱 + 目录 + 反链）

**Files:**
- Create: `src/components/OnThisPage.astro`
- Create: `src/components/Backlinks.astro`
- Create: `src/components/LocalGraph.astro`
- Create: `src/components/RightPanel.astro`

- [ ] **Step 1: 创建 OnThisPage 组件**

Create `src/components/OnThisPage.astro`:

```astro
---
interface Props {
  headings: { depth: number; slug: string; text: string }[];
}
const { headings } = Astro.props;
---

{headings.length > 0 && (
  <section>
    <h4>On This Page</h4>
    <ul class="toc-list">
      {headings.map(h => (
        <li class={`toc-item depth-${h.depth}`}>
          <a href={`#${h.slug}`}>{h.text}</a>
        </li>
      ))}
    </ul>
  </section>
)}

<style>
  .toc-list { list-style: none; }
  .toc-item a {
    display: block;
    padding: 4px 0;
    color: var(--text-muted);
    font-size: 13px;
    text-decoration: none;
  }
  .toc-item a:hover { color: var(--text-secondary); }
  .toc-item.depth-3 { padding-left: 12px; }
</style>
```

- [ ] **Step 2: 创建 Backlinks 组件**

Create `src/components/Backlinks.astro`:

```astro
---
interface Props {
  backlinks: { slug: string; title: string }[];
}
const { backlinks } = Astro.props;
---

{backlinks.length > 0 && (
  <section>
    <h4>Links to This Page</h4>
    <ul class="backlink-list">
      {backlinks.map(bl => (
        <li><a href={`/notes/${bl.slug}`}>{bl.title}</a></li>
      ))}
    </ul>
  </section>
)}

<style>
  .backlink-list { list-style: none; }
  .backlink-list a {
    display: block;
    padding: 4px 0;
    color: var(--accent);
    font-size: 13px;
  }
</style>
```

- [ ] **Step 3: 创建 LocalGraph 组件**

Create `src/components/LocalGraph.astro`:

```astro
---
interface Props {
  graphData: {
    nodes: { id: string; name: string }[];
    links: { source: string; target: string }[];
  };
  currentId: string;
}
const { graphData, currentId } = Astro.props;
---

<section class="graph-section">
  <h4>Interactive Graph</h4>
  <div id="local-graph" data-graph={JSON.stringify(graphData)} data-current={currentId}></div>
  <a href="/graph" class="expand-link">Expand →</a>
</section>

<style>
  .graph-section { margin-bottom: 24px; }
  #local-graph { width: 100%; height: 200px; }
  .expand-link {
    display: inline-block;
    margin-top: 8px;
    color: var(--text-muted);
    font-size: 12px;
  }
</style>

<script>
  import ForceGraph from 'force-graph';
  import type { GraphData } from 'force-graph';

  document.querySelectorAll('#local-graph').forEach(container => {
    const el = container as HTMLElement;
    const data = JSON.parse(el.dataset.graph || '{}') as GraphData;
    const currentId = el.dataset.current;

    ForceGraph()(el)
      .graphData(data)
      .nodeId('id')
      .nodeLabel('name')
      .nodeColor((node: any) => node.id === currentId ? '#6ab0e6' : '#666666')
      .nodeVal((node: any) => node.id === currentId ? 3 : 1)
      .linkColor(() => 'rgba(136,136,136,0.3)')
      .linkWidth(1)
      .backgroundColor('transparent')
      .width(el.offsetWidth)
      .height(200)
      .enableNodeDrag(false)
      .onNodeClick((node: any) => {
        if (node.id !== currentId) {
          window.location.href = `/notes/${node.id}`;
        }
      });
  });
</script>
```

- [ ] **Step 4: 创建 RightPanel 容器组件**

Create `src/components/RightPanel.astro`:

```astro
---
import LocalGraph from './LocalGraph.astro';
import OnThisPage from './OnThisPage.astro';
import Backlinks from './Backlinks.astro';

interface Props {
  headings?: { depth: number; slug: string; text: string }[];
  backlinks?: { slug: string; title: string }[];
  graphData?: object;
  currentId?: string;
}
const { headings = [], backlinks = [], graphData, currentId } = Astro.props;
---

{graphData && currentId && <LocalGraph graphData={graphData} currentId={currentId} />}
<OnThisPage headings={headings} />
<Backlinks backlinks={backlinks} />
```

- [ ] **Step 5: 验证右侧面板**

Run: `npm run dev`

打开任意文档页面，确认右侧显示图谱、页内目录、反向链接。

- [ ] **Step 6: 提交**

```bash
git add src/components/RightPanel.astro src/components/LocalGraph.astro src/components/OnThisPage.astro src/components/Backlinks.astro
git commit -m "feat: add right panel with local graph, TOC, and backlinks"
```

---

## Task 7: 全局图谱页

**Files:**
- Create: `src/pages/graph.astro`

- [ ] **Step 1: 创建全局图谱页面**

Create `src/pages/graph.astro`:

```astro
---
import { getCollection } from 'astro:content';
import { buildSlugMap } from '../utils/slug-map';
import Layout from '../layouts/Layout.astro';

const allNotes = await getCollection('notes');
const slugMap = await buildSlugMap();
const existingSlugs = new Set(allNotes.map(n => n.slug));

const nodes = allNotes.map(n => ({
  id: n.slug,
  name: n.data.title,
}));

const links: { source: string; target: string }[] = [];
allNotes.forEach(source => {
  const matches = source.body.match(/\[\[(.*?)\]\]/g);
  if (matches) {
    matches.forEach(link => {
      const targetName = link.replace(/[\[\]]/g, '').split('|')[0];
      const targetSlug = slugMap.get(targetName);
      if (targetSlug) {
        links.push({ source: source.slug, target: targetSlug });
      }
    });
  }
});

const graphData = { nodes, links };
---

<Layout title="全局图谱">
  <div style="display: flex; flex-direction: column; height: 100vh;">
    <header style="padding: 16px 24px; display: flex; align-items: center; gap: 16px;">
      <a href="/" style="color: #ccc;">← 返回</a>
      <h1 style="color: #fff; font-size: 18px; margin: 0;">Global Graph</h1>
    </header>
    <div id="global-graph" style="flex: 1;" data-graph={JSON.stringify(graphData)}></div>
  </div>
</Layout>

<script>
  import ForceGraph from 'force-graph';

  const el = document.getElementById('global-graph')!;
  const data = JSON.parse(el.dataset.graph || '{}');

  ForceGraph()(el)
    .graphData(data)
    .nodeId('id')
    .nodeLabel('name')
    .nodeColor(() => '#6ab0e6')
    .nodeVal(2)
    .linkColor(() => 'rgba(136,136,136,0.3)')
    .linkWidth(1)
    .backgroundColor('#1e1e1e')
    .warmupTicks(50)
    .cooldownTicks(200)
    .onNodeClick((node: any) => {
      window.location.href = `/notes/${node.id}`;
    });
</script>
```

- [ ] **Step 2: 验证全局图谱**

Run: `npm run dev`

访问 `/graph`，确认全屏图谱显示所有节点和连线，点击节点可跳转。

- [ ] **Step 3: 提交**

```bash
git add src/pages/graph.astro
git commit -m "feat: add global graph page"
```

---

## Task 8: Pagefind 搜索

**Files:**
- Modify: `package.json`（添加 postbuild 脚本）
- Create: `src/components/SearchDialog.astro`
- Modify: `src/components/Sidebar.astro`

- [ ] **Step 1: 添加 Pagefind 构建 hook**

```bash
npm install -D pagefind
```

Modify `package.json` scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && npx pagefind --site dist --language zh",
    "preview": "astro preview",
    "astro": "astro"
  }
}
```

- [ ] **Step 2: 为内容区域添加 data-pagefind-body 标记**

Modify `src/components/PageLayout.astro` — 在 `<main>` 上添加属性：

```astro
<main class="content-area" data-pagefind-body>
  <slot />
</main>
```

- [ ] **Step 3: 创建搜索弹窗组件**

Create `src/components/SearchDialog.astro`:

```astro
---
---

<div id="search-dialog" class="search-overlay" style="display:none">
  <div class="search-container">
    <input type="text" id="search-input" placeholder="搜索文档..." />
    <ul id="search-results"></ul>
  </div>
</div>

<style>
  .search-overlay {
    position: fixed; inset: 0; z-index: 100;
    background: rgba(0,0,0,0.6);
    display: flex; justify-content: center; padding-top: 120px;
  }
  .search-container {
    width: 560px; max-height: 400px;
    background: var(--bg-sidebar); border-radius: 8px;
    overflow: hidden; border: 1px solid var(--border-color);
  }
  #search-input {
    width: 100%; padding: 14px 18px;
    background: transparent; border: none; border-bottom: 1px solid var(--border-color);
    color: var(--text-primary); font-size: 16px; outline: none;
  }
  #search-results {
    list-style: none; max-height: 340px; overflow-y: auto;
  }
  #search-results li a {
    display: block; padding: 10px 18px;
    color: var(--text-secondary); text-decoration: none;
  }
  #search-results li a:hover { background: var(--bg-hover); }
</style>

<script>
  let pagefindUI: any = null;

  async function initSearch() {
    if (!pagefindUI) {
      pagefindUI = await import('/pagefind/pagefind.js');
    }
    return pagefindUI;
  }

  const overlay = document.getElementById('search-dialog')!;
  const input = document.getElementById('search-input') as HTMLInputElement;
  const results = document.getElementById('search-results')!;

  // Ctrl/Cmd + K 打开搜索
  document.addEventListener('keydown', async (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      overlay.style.display = 'flex';
      input.focus();
    }
    if (e.key === 'Escape') {
      overlay.style.display = 'none';
      input.value = '';
      results.innerHTML = '';
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });

  input.addEventListener('input', async () => {
    const search = await initSearch();
    const query = input.value.trim();
    if (!query) { results.innerHTML = ''; return; }

    const response = await search(query);
    results.innerHTML = response.results.slice(0, 10).map((r: any) =>
      `<li><a href="${r.url}">${r.data?.title || r.url}</a></li>`
    ).join('');
  });
</script>
```

- [ ] **Step 4: 在 Sidebar 中绑定搜索按钮**

在 `src/components/Sidebar.astro` 的 `<script>` 或全局中添加：

```javascript
document.getElementById('search-trigger')?.addEventListener('click', () => {
  document.getElementById('search-dialog')!.style.display = 'flex';
  document.getElementById('search-input')?.focus();
});
```

将 SearchDialog 组件添加到 Layout.astro 的 body 底部。

- [ ] **Step 5: 验证搜索**

Run: `npm run build && npm run preview`

构建完成后访问站点，按 Ctrl+K 或点击搜索按钮，输入关键词确认搜索结果。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json src/components/SearchDialog.astro src/components/Sidebar.astro src/layouts/Layout.astro src/components/PageLayout.astro
git commit -m "feat: add Pagefind full-text search with Chinese support"
```

---

## Task 9: GitLab CI/CD 部署配置

**Files:**
- Create: `.gitlab-ci.yml`
- Create: `nginx.conf.example`

- [ ] **Step 1: 创建 GitLab CI 配置**

Create `.gitlab-ci.yml`:

```yaml
stages:
  - deploy

deploy:
  stage: deploy
  only:
    - main
  image: node:22
  before_script:
    - 'which rsync || (apt-get update -qq && apt-get install -y -qq rsync)'
  script:
    - npm ci
    - npm run build
    - rsync -az --delete dist/ ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}
  tags:
    - docker
```

- [ ] **Step 2: 创建 Nginx 配置示例**

Create `nginx.conf.example`:

```nginx
server {
    listen 80;
    server_name kb.your-company.internal;

    root /var/www/kb;
    index index.html;

    location / {
        try_files $uri $uri.html $uri/ =404;
    }

    # Pagefind 静态资源
    location /pagefind/ {
        expires 30d;
    }
}
```

- [ ] **Step 3: 提交**

```bash
git add .gitlab-ci.yml nginx.conf.example
git commit -m "feat: add GitLab CI/CD and Nginx deployment config"
```

---

## Task 10: 清理与最终验证

**Files:**
- Delete: `src/components/Welcome.astro`（未使用）
- Delete: `src/assets/astro.svg`, `src/assets/background.svg`（未使用）

- [ ] **Step 1: 删除未使用的模板文件**

```bash
rm src/components/Welcome.astro src/assets/astro.svg src/assets/background.svg
```

- [ ] **Step 2: 完整构建验证**

```bash
npm run build
```

确认构建成功，无错误。检查 `dist/` 目录结构包含所有笔记页面和 `/graph/index.html`。

- [ ] **Step 3: 本地预览完整功能**

```bash
npm run preview
```

验证清单：
- [ ] 首页重定向到欢迎文档
- [ ] 左侧导航树正确显示，当前页高亮
- [ ] 文档内容正确渲染 Markdown
- [ ] `[[链接]]` 变为可点击跳转
- [ ] 右侧局部图谱显示关联节点，可点击跳转
- [ ] 页内目录（On This Page）正确提取 h2/h3
- [ ] 反向链接（Links to This Page）正确显示
- [ ] 搜索功能（Ctrl+K）正常工作
- [ ] 全局图谱页 `/graph` 显示完整图谱

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "chore: clean up unused template files"
```
