# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### Simplicity First

- No features beyond what was asked. No speculative abstractions.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical Changes

- Touch only what you must. Match existing style.
- Remove imports/variables/functions that YOUR changes made unused.
- Don't refactor things that aren't broken.

### Goal-Driven Execution
 Define success criteria. Loop until verified.
- Transform tasks into verifiable goals:
  - "Add validation" → "Write tests for invalid inputs, then make them pass"
  - "Fix the bug" → "Write a test that reproduces it, then make it pass"
  - "Refactor X" → "Ensure tests pass before and after"
- For multi-step tasks, state a brief plan:
  1. [Step] → verify: [check]
  2. [Step] → verify: [check]
  3. [Step] → verify: [check]
- Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

## Project Overview

Astro 6 静态站点，将 Obsidian 笔记库发布为类似 Obsidian Publish 的知识库网站。支持 `[[wikilink]]` 双链、Obsidian 扩展语法（`==高亮==`、`%%注释%%`、callout）、图谱可视化（force-graph）、中文全文搜索（Pagefind）。

## Commands

```bash
npm run dev                # 同步外部内容 + 启动开发服务器
npm run build              # 仅构建（不同步外部内容）+ Pagefind 索引
npm run build:with-sync    # 同步 + 构建 + Pagefind 索引
npm run sync               # 仅同步外部内容（从 content-repos.json 拉取）
npm run preview            # 预览构建结果
```

Node.js >= 22，无测试框架。

## Architecture

### 内容管道

`content-repos.json` 声明远程 Obsidian 仓库 → `scripts/sync-content.mjs` clone/pull 到 `.astro/content-cache/` → 复制 .md 和图片到 `src/content/notes/` → Astro glob loader (`src/content.config.ts`) 扫描并索引。

Astro glob loader 会将文件路径去点号、空格变短横线、全小写作为 id。所有 slug 解析逻辑必须处理这个转换。

### Markdown 处理链（remark/rehype 插件）

插件在 `astro.config.mjs` 中注册，执行顺序：

1. **remarkWikilinks** (`src/plugins/remark-wikilinks.ts`) — 解析 `[[wikilink]]` 和 `![[image]]` 语法，将链接转为 Astro 路由，图片转为 `<img>` 指向 `images/`
2. **remarkObsidianExt** (`src/plugins/remark-obsidian-ext.ts`) — `==text==` → `<mark>`，`%%text%%` 移除，`> [!TYPE]` → callout
3. **rehypeRelativeMdLinks** (`src/plugins/rehype-relative-md-links.ts`) — 将 `[text](file.md)` 标准链接重写为站点路由

三个插件共享同一套 slug 解析策略：精确路径优先 → 文件名唯一匹配 → 同目录消歧 → 兜底取第一个。

### 链接解析的两个阶段

- **构建时**：`astro.config.mjs` 中的 `buildSlugIndexFromFS()` 扫描文件系统，生成 byPath/byName Map，传给 remark/rehype 插件
- **运行时**（SSG 构建中）：`src/utils/slug-map.ts` 通过 `getCollection('notes')` 构建索引，用于反向链接和导航树

### 反向链接

`src/utils/backlinks.ts` 单次遍历所有笔记的 `[[wikilink]]`，构建 `Map<targetId, BacklinkEntry[]>`。通过 `src/utils/backlink-cache.ts` 缓存。

### 导航树

`src/utils/nav-tree.ts` 将笔记 id（如 `前端组/技术文档/前端规范`）解析为嵌套目录树，目录在前文件在后，支持 frontmatter `order` 排序。

### 图片处理

构建时 `scripts/pagefind.mjs` 将 `src/content/notes/` 和 `attachments/` 中的图片复制到 `dist/images/`。`astro.config.mjs` 的 `buildImageIndex()` 构建图片路径索引供 wikilink 插件查找。

### 构建后处理

`npm run build` 在 `astro build` 之后运行 `scripts/pagefind.mjs`：复制图片 + 执行 Pagefind 索引（`--force-language zh`）。

### 部署

- **GitLab Pages**：推 main 自动构建，CI 通过 `SYNC_SSH_KEY` 拉取外部仓库
- **GitHub Pages**：推 main 自动构建，设置 `BASE_PATH=/Neural-Site/`
- 本地/内部 Nginx：`BASE_PATH` 默认 `/`

## Key Conventions

- 内容放 `src/content/notes/`，按知识库目录组织（如 `前端组/`、`运维组/`）
- `src/content/notes/*/` 被 `.gitignore` 排除（由 sync 脚本管理），直接在该目录下新建的子目录不会被 git 跟踪
- Frontmatter schema 见 `src/content.config.ts`，字段宽松（`作者`/`创建日期`/`修改日期` 用 `z.any()`）
- 暗色主题 Obsidian Publish 风格，样式在 `src/styles/global.css`
- 三栏布局：左侧 NavTree + 中间内容 + 右侧 TOC/Backlinks/LocalGraph

