# 内部知识库设计文档

## 背景

基于 short-star 项目（Astro 6 + force-graph），构建面向 20+ 人开发团队的内部知识库。
支持双平台部署：GitLab CI 推送到内部 Nginx 服务器，或 GitHub Actions 部署到 GitHub Pages。

## 技术栈

- **框架**: Astro 6（静态站点生成）
- **图谱**: force-graph（已集成）
- **搜索**: Pagefind
- **部署**: GitLab CI → rsync → Nginx / GitHub Actions → GitHub Pages
- **写作流程**: docs-as-code（git push → 自动构建部署）

## 页面布局

三栏布局，Obsidian Publish 深色风格。

```
┌─────────────────────────────────────────────────────────┐
│  顶部栏：Logo + 站名                                      │
├───────────┬─────────────────────────┬───────────────────┤
│ 左侧导航栏 │      文档内容区          │    右侧面板        │
│ #252525   │      #1E1E1E           │    #1E1E1E        │
│           │                        │                   │
│ 🔍 搜索框  │  # 主标题（白色）        │ INTERACTIVE GRAPH │
│           │  副标题/描述（浅灰）      │  (local graph)    │
│ ▶ 入门     │                        │                   │
│ ▼ 技术文档 │  正文内容（浅灰文字）     │ ON THIS PAGE      │
│   · API   │                        │  (页内目录)        │
│   · 架构   │  [[链接]] → 站内跳转    │                   │
│ ▶ 流程规范 │                        │ LINKS TO THIS PAGE│
│           │                        │  (反向链接列表)     │
├───────────┴─────────────────────────┴───────────────────┤
│  Footer: Powered by short-star                           │
└─────────────────────────────────────────────────────────┘
```

### 配色

- 背景：`#1E1E1E`，侧栏：`#252525`
- 主标题：`#FFFFFF`，正文：`#CCCCCC`
- 选中项：`#333333` 背景 + 白色文字
- 图谱节点：浅灰填充 + 白色文字 + 灰色连线

### 移动端

左栏和右栏折叠为抽屉式菜单。

## 内容结构

### 目录组织

按团队分组，每个团队目录下可包含任意层级的子目录。外部团队内容通过 sync 系统自动拉取（见「外部内容同步」章节）。

```
src/content/notes/
├── 入门/
│   ├── 快速开始.md
│   └── 关于本站.md
├── 前端组/
│   ├── 故障复盘/
│   │   └── 前端白屏事故.md
│   └── 技术文档/
│       ├── 前端架构.md
│       ├── 前端规范.md
│       ├── 前端测试.md
│       ├── 前端性能.md
│       └── 组件库.md
├── 后端组/
│   ├── 故障复盘/
│   │   └── 2024-03-数据库连接池事故.md
│   └── 技术文档/
│       ├── API规范.md
│       ├── 后端规范.md
│       ├── 架构设计.md
│       └── 数据库设计.md
└── 运维组/                    ← 通过 sync-content 自动同步
    ├── 欢迎.md
    ├── 图片引用测试.md
    ├── attachments/
    └── 技术文档/images/
```

### Frontmatter Schema

```typescript
// src/content.config.ts
const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string().optional(),             // 可选，缺失时用文件名（不含扩展名）作为标题
    tags: z.array(z.string()).optional(),     // 可选，分类筛选
    order: z.number().optional(),             // 可选，同目录排序权重，默认按文件名排序
  }),
});
```

### 命名约束

- 文件名不要求全局唯一；wikilink 解析优先级：完整路径精确匹配 > 文件名（唯一时）> 同组目录优先 > 兜底第一个匹配项
- 如需精确指向，使用完整路径 `[[目录/文件名]]`
- slug 格式：`入门/快速开始.md` → slug 为 `入门/快速开始`

### 双向链接

- `[[文件名]]` 链接到同名文档（不含路径），如 `[[API规范]]` → `技术文档/API规范.md`
- `[[文件名#标题]]` 链接到文档内的指定标题锚点
- `[[#标题]]` 链接到当前文档内的标题锚点
- `[[文件名|显示文字]]` 使用别名显示
- `[[文件名#标题|显示文字]]` 组合用法
- 渲染为 `<a href="/notes/技术文档/API规范">API规范</a>`
- 目标不存在时显示为灰色虚线样式
- **实现方式**：自定义 remark 插件（`remark-wikilinks`），在 Markdown AST 层将 `[[...]]` 转换为 `<a>` 标签，构建时用 slug map 做解析。支持歧义消解：同名文件优先匹配同目录

### Obsidian 图片嵌入

- `![[image.png]]` 嵌入图片，支持 png/jpg/jpeg/gif/svg/webp/bmp/ico
- `![[image.png|300]]` 指定图片宽度（像素）
- 图片解析顺序：先按文件名在所有文档中搜索，再按路径匹配
- 外部同步的图片资源会自动复制到 `src/content/notes/` 对应目录

## 路由

所有内部链接通过 `BASE_PATH` 环境变量支持子路径部署（如 GitHub Pages 的 `/Neural-Site/`）。

| 路由 | 说明 |
|---|---|
| `/` | 首页，重定向到第一个文档或欢迎页 |
| `/notes/[...slug]` | 动态路由，`getStaticPaths()` 预渲染所有笔记页面 |
| `/graph` | 全局图谱页面（从右侧 Expand 进入），复用现有 force-graph 全屏渲染 |

### 右侧面板图谱

- 默认展示 local graph：当前文档 + 一级关联节点
- 点击 Expand → 跳转 `/graph` 展示全局图谱
- force-graph 渲染，嵌入右侧固定容器

### ON THIS PAGE（页内目录）

- 从 Markdown 渲染后的 `<h2>` 和 `<h3>` 标签自动提取
- 点击跳转到对应锚点

### 反向链接

构建时扫描所有文档，找出引用当前文档的来源，显示在 "LINKS TO THIS PAGE" 区域。

## 搜索

集成 Pagefind，Astro 构建后通过 `scripts/pagefind.mjs` 自动生成索引。
- 构建脚本同时负责将 `src/content/notes/` 和 `attachments/` 中的图片复制到 `dist/images/`
- 使用 `--force-language zh` 开启中文分词
- 搜索 UI 组件放在左侧导航栏顶部

## 左侧导航

- 从 `src/content/notes/` 的目录结构自动生成树形导航
- 支持任意层级的嵌套目录（如 `后端组/技术文档/`、`前端组/故障复盘/`）
- 使用原生 `<details>/<summary>` 实现展开/折叠
- 目录内按 `order` 字段排序，无 `order` 则按文件名排序
- 当前页面高亮，当前页所在的父级目录自动展开

## 部署

支持双平台部署：GitLab CI（内部 Nginx）和 GitHub Actions（GitHub Pages）。构建逻辑按平台分离，共享核心 build 步骤。

### GitLab CI/CD（内部 Nginx）

```yaml
stages:
  - deploy

deploy:
  stage: deploy
  only:
    - main
  image: node:22
  script:
    - npm ci
    - npm run build
    - rsync -az --delete dist/ user@nginx-server:/var/www/kb/
  tags:
    - doc
```

### GitHub Actions（GitHub Pages）

```yaml
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      BASE_PATH: /Neural-Site/
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
      - uses: actions/deploy-pages@v4
```

### Nginx 配置

- 根目录 `/var/www/kb/`
- Astro 静态输出，每个路由预渲染为独立 HTML 文件
- `try_files $uri $uri.html $uri/ =404`（纯静态匹配，不需要 SPA 回退）
- 绑定内网域名 `http://kb.your-company.internal`

### 权限

- GitLab 仓库权限控制编辑（谁能 push main）
- Nginx 侧只读，全员可浏览

## 外部内容同步

通过 `scripts/sync-content.mjs` 从外部 Git 仓库自动拉取文档内容。

- 配置文件：`content-repos.json`，声明远程仓库地址、分支、目标目录
- 同步时自动忽略 `.git`、`.obsidian`、`.github` 等非内容目录
- 图片资源同步复制到 `src/content/notes/` 对应目录下
- 集成到 npm scripts：`npm run dev` 和 `npm run build:with-sync` 会先执行同步

```json
// content-repos.json 示例
[{
  "repo": "https://git.example.com/team/docs.git",
  "branch": "develop",
  "targetDir": "运维组"
}]
```

## 性能

- 针对文档规模优化：支持 1000+ 篇文档的构建和运行时性能
- 全局图谱的节点过滤在服务端完成，避免客户端处理大量数据
- 反向链接通过缓存机制（`backlink-cache.ts`）加速构建
