# Neural-Site — 个人知识库

基于 Astro 6 构建的 Obsidian Publish 风格知识库站点，支持 `[[wikilink]]` 双链、标准 Markdown 链接、图谱可视化、中文全文搜索。

## 功能特性

- **双链接格式** — 同时支持 `[[wikilink]]` 和标准 `[text](file.md)` Markdown 链接，兼容 GitBook/Obsidian 等来源
- **交互式图谱** — 全局图谱与局部图谱，节点 hover 高亮连线，缩放自动隐藏标签
- **中文全文搜索** — 集成 Pagefind，Ctrl+K 快速搜索
- **卡片式首页** — 自动扫描知识库目录，按文档数量排序展示
- **三栏布局** — 左侧目录导航 + 中间内容区 + 右侧 TOC / 反向链接 / 局部图谱
- **暗色主题** — Obsidian Publish 风格深色界面
- **双部署** — GitLab CI → 内部 Nginx / GitHub Actions → GitHub Pages

## 项目结构

```
src/
├── components/
│   ├── Backlinks.astro          # 反向链接列表
│   ├── LocalGraph.astro         # 局部知识图谱
│   ├── NavTree.astro            # 树状导航菜单
│   ├── OnThisPage.astro         # 页面内目录 (TOC)
│   ├── PageLayout.astro         # 笔记页面三栏布局
│   ├── RightPanel.astro         # 右侧面板容器
│   ├── SearchDialog.astro       # Pagefind 搜索弹窗
│   └── Sidebar.astro            # 左侧边栏
├── content/
│   └── notes/                   # Markdown 文档（按知识库目录组织）
│       ├── Go入门指南/
│       ├── Docker技术/
│       ├── Kubernetes技术/
│       └── ...
├── layouts/
│   └── Layout.astro             # 全局 HTML 布局
├── pages/
│   ├── graph.astro              # 全局图谱页
│   ├── index.astro              # 卡片式首页
│   └── notes/[...slug].astro    # 笔记动态路由
├── plugins/
│   ├── remark-wikilinks.ts      # Wikilink 解析插件
│   └── rehype-relative-md-links.ts  # 标准 .md 链接重写插件
├── styles/
│   └── global.css               # 全局样式与暗色主题
└── utils/
    ├── backlink-cache.ts        # 反向链接缓存
    ├── nav-tree.ts              # 导航树构建
    └── slug-map.ts              # Slug 索引与链接解析
```

## 快速开始

```bash
# 安装依赖（需要 Node.js >= 22.12）
npm install

# 本地开发
npm run dev

# 构建生产版本
npm run build

# 本地预览构建结果
npm run preview
```

## 添加外部内容

将 Markdown 文件放到 `src/content/notes/` 下任意子目录即可，构建时自动索引。支持直接放入 GitBook 格式的内容（含 `[text](file.md)` 标准链接）。

## 文档编写

文档放在 `src/content/notes/` 目录下，使用 Markdown 格式，支持以下 frontmatter 字段：

```yaml
---
title: 文档标题        # 可选，缺省时用文件名
tags: [标签1, 标签2]   # 可选
order: 10              # 可选，控制导航排序
---
```

### 链接语法

同时支持两种格式：

| 语法 | 说明 |
|------|------|
| `[[快速开始]]` | Wikilink 链接到同名文件 |
| `[[路径/页面]]` | Wikilink 按路径链接 |
| `[[页面#标题]]` | Wikilink 链接到标题 |
| `[[页面\|别名]]` | Wikilink 使用别名 |
| `[text](file.md)` | 标准 Markdown 链接（自动解析为站点路由） |

### 图片

支持 Obsidian 原生 `![[image.png]]` 语法。图片放在：

- `attachments/` — 全局附件目录
- `src/content/notes/` — 跟笔记放一起

```markdown
![[screenshot.png]]           # 按文件名引用
![[screenshot.png|300]]       # 指定宽度（px）
![[screenshot.png|50%]]       # 指定宽度（百分比）
```

## 部署

### GitHub Pages

推送 `main` 分支自动触发 GitHub Actions 部署，通过 `BASE_PATH=/Neural-Site/` 环境变量处理路径前缀。

### 内部 Nginx（GitLab CI）

1. 在 GitLab 项目 Settings → CI/CD → Variables 中配置：
   - `DEPLOY_USER` — SSH 用户名
   - `DEPLOY_HOST` — 服务器地址
   - `DEPLOY_PATH` — Nginx 静态文件目录

2. 推送到 GitLab 即自动部署，内部部署无需路径前缀。

## 技术栈

- [Astro 6](https://astro.build) — 静态站点框架
- [force-graph](https://github.com/vasturiano/force-graph) — 力导向图可视化
- [Pagefind](https://pagefind.app) — 静态全文搜索
