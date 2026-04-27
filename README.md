# Neural-Site — 内部团队知识库

基于 Astro 6 构建的 Obsidian Publish 风格内部知识库，支持 `[[wikilink]]` 双链、图谱可视化、中文全文搜索，面向 20+ 人开发团队。

## 功能特性

- **Obsidian 风格 Wikilink** — 支持 `[[页面]]`、`[[页面#标题]]`、`[[路径/页面]]`、`[[页面|别名]]` 等语法
- **交互式图谱** — 基于 force-graph 的全局图谱与页面级局部图谱
- **中文全文搜索** — 集成 Pagefind，支持 CJK 分词，Ctrl+K 快速搜索
- **三栏布局** — 左侧目录导航 + 中间内容 + 右侧 TOC / 反向链接 / 局部图谱
- **多部门支持** — 按部门/团队组织文档，自动生成树状导航
- **暗色主题** — 匹配 Obsidian Publish 风格的深色界面
- **双部署** — GitLab CI → 内部 Nginx / GitHub Actions → GitHub Pages

## 项目结构

```
src/
├── components/
│   ├── Backlinks.astro       # 反向链接列表
│   ├── LocalGraph.astro      # 局部知识图谱
│   ├── NavTree.astro         # 树状导航菜单
│   ├── OnThisPage.astro      # 页面内目录 (TOC)
│   ├── PageLayout.astro      # 笔记页面三栏布局
│   ├── RightPanel.astro      # 右侧面板容器
│   ├── SearchDialog.astro    # Pagefind 搜索弹窗
│   └── Sidebar.astro         # 左侧边栏
├── content/
│   └── notes/                # Markdown 文档（按部门/层级组织）
│       ├── 入门/
│       ├── 前端组/
│       ├── 后端组/
│       └── 运维组/
├── layouts/
│   └── Layout.astro          # 全局 HTML 布局
├── pages/
│   ├── graph.astro           # 全局图谱页
│   ├── index.astro           # 首页重定向
│   └── notes/[...slug].astro # 笔记动态路由
├── plugins/
│   └── remark-wikilinks.ts   # Wikilink 解析插件
├── styles/
│   └── global.css            # 全局样式与暗色主题
└── utils/
    ├── backlinks.ts          # 反向链接计算
    ├── nav-tree.ts           # 导航树构建
    └── slug-map.ts           # Slug 索引与链接解析
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

## 文档编写

文档放在 `src/content/notes/` 目录下，使用 Markdown 格式，支持以下 frontmatter 字段：

```yaml
---
title: 文档标题        # 必填
tags: [标签1, 标签2]   # 可选
order: 10              # 可选，控制导航排序
---
```

### Wikilink 语法

| 语法 | 说明 |
|------|------|
| `[[快速开始]]` | 链接到同名文件 |
| `[[前端组/技术文档/前端规范]]` | 按路径链接 |
| `[[前端规范#代码风格]]` | 链接到标题 |
| `[[前端规范\|编码规范]]` | 使用别名 |
| `[[#标题]]` | 链接到当前页面标题 |

### 图片

支持 Obsidian 原生 `![[image.png]]` 语法。图片放在两个位置：

- `attachments/` — 全局附件目录（推荐）
- `src/content/notes/` — 跟笔记放一起

```markdown
![[screenshot.png]]           # 按文件名引用
![[screenshot.png|300]]       # 指定宽度（px）
![[screenshot.png|50%]]       # 指定宽度（百分比）
![[前端组/技术文档/架构图.png]] # 按路径引用
```

同名图片按路径精确匹配 → 同组目录优先 → 取第一个的规则解析。

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
