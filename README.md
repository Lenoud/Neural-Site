# Neural-Site — 知识库站点

基于 Astro 6 构建的 Obsidian Publish 风格知识库站点，支持 `[[wikilink]]` 双链、标准 Markdown 链接、Obsidian 扩展语法、图谱可视化、中文全文搜索。

## 功能特性

- **双链接格式** — 同时支持 `[[wikilink]]` 和标准 `[text](file.md)` Markdown 链接，兼容 GitBook/Obsidian 等来源
- **Obsidian 语法** — 支持 `==高亮==`、`%%注释%%`、`> [!NOTE] Callout` 等扩展语法
- **交互式图谱** — 全局图谱与局部图谱，支持 1-3 层深度调节，节点 hover 高亮连线，缩放自动隐藏标签
- **图片优化** — 构建时自动生成 WebP 格式（体积减少约 80%），`<picture>` 元素自适应加载
- **图片灯箱** — 点击图片原地放大查看，Medium/Notion 风格交互体验
- **中文全文搜索** — 集成 Pagefind，`Cmd+K` / `Ctrl+K` 快捷键唤起
- **卡片式首页** — 自动扫描知识库目录，按文档数量排序展示
- **三栏布局** — 左侧目录导航 + 中间内容区 + 右侧 TOC / 元信息 / 反向链接 / 局部图谱
- **外部内容同步** — 通过 `content-repos.json` 配置，构建时自动从远程仓库拉取内容
- **暗色主题** — Obsidian Publish 风格深色界面
- **双部署** — GitLab Pages（团队）+ GitHub Pages（个人镜像）

## 项目结构

```
src/
├── components/                    # UI 组件
├── content/
│   └── notes/                     # Markdown 文档（按知识库目录组织）
├── layouts/                       # 页面布局
├── pages/
│   ├── graph.astro                # 全局图谱页
│   ├── index.astro                # 卡片式首页
│   └── notes/[...slug].astro      # 笔记动态路由
├── plugins/
│   ├── remark-wikilinks.ts        # Wikilink 解析插件
│   ├── remark-obsidian-ext.ts     # Obsidian 扩展语法插件
│   └── rehype-relative-md-links.ts # 标准 .md 链接重写插件
├── styles/
│   └── global.css                 # 全局样式与暗色主题
└── utils/
    ├── backlink-cache.ts          # 反向链接缓存
    ├── nav-tree.ts                # 导航树构建
    └── slug-map.ts                # Slug 索引与链接解析
scripts/
├── sync-content.mjs               # 外部内容仓库同步脚本
└── pagefind.mjs                    # 图片优化 + Pagefind 索引
content-repos.json                 # 外部仓库同步配置
```

## 快速开始

```bash
# 安装依赖（需要 Node.js >= 22）
npm install

# 本地开发
npm run dev

# 构建生产版本
npm run build

# 构建（含外部内容同步）
npm run build:with-sync
```

## 内容管理

### 本地内容

将 Markdown 文件放到 `src/content/notes/` 下任意子目录即可，构建时自动索引。

### 外部内容同步

编辑 `content-repos.json` 配置远程仓库，构建时自动拉取：

```json
{
  "repos": [
    {
      "url": "ssh://git@example.com:port/group/repo.git",
      "branch": "main",
      "dir": "my-knowledge-base"
    }
  ]
}
```

使用 `npm run build:with-sync` 或在 CI 中触发同步。

## 文档编写

文档放在 `src/content/notes/` 目录下，使用 Markdown 格式，支持以下 frontmatter 字段：

```yaml
---
title: 文档标题        # 可选，缺省时用文件名
tags: [标签1, 标签2]   # 可选，也支持纯字符串
order: 10              # 可选，控制导航排序
作者: xxx              # 可选，显示在右侧元信息面板
创建日期: 2025-01-01   # 可选
修改日期: 2025-06-01   # 可选
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

### Obsidian 扩展语法

| 语法 | 效果 |
|------|------|
| `==高亮文本==` | 高亮标记 |
| `%%注释内容%%` | 隐藏注释（不渲染） |
| `> [!NOTE]` | Callout 提示框（支持 note/tip/warning/important/caution/info/example/quote） |

### 图片

支持 Obsidian 原生 `![[image.png]]` 语法，点击可放大查看。图片放在：

- `attachments/` — 全局附件目录
- `src/content/notes/` — 跟笔记放一起

```markdown
![[screenshot.png]]           # 按文件名引用
![[screenshot.png|300]]       # 指定宽度（px）
![[screenshot.png|50%]]       # 指定宽度（百分比）
```

构建时 PNG/JPEG 自动转换为 WebP（减少约 80% 体积），浏览器优先加载 WebP 格式。CI 环境不支持 sharp 时自动跳过优化。

## 部署

### GitLab Pages（主部署）

推送到 `main` 分支自动触发 GitLab CI 构建。CI 流程：

1. 通过 SSH 拉取外部内容仓库（需配置 `SYNC_SSH_KEY` CI 变量，类型选择 File）
2. 安装依赖并构建（含内容同步）
3. 输出到 `public/` 目录，由 GitLab Pages 服务

如需在其他项目更新时自动重新部署，可使用 Pipeline Trigger Token 跨项目触发。

### GitHub Pages（个人镜像）

推送 `main` 分支自动触发 GitHub Actions 部署。如需路径前缀，设置 `BASE_PATH` 环境变量。

## 技术栈

- [Astro 6](https://astro.build) — 静态站点框架
- [force-graph](https://github.com/vasturiano/force-graph) — 力导向图可视化
- [Pagefind](https://pagefind.app) — 静态全文搜索
- [sharp](https://sharp.pixelplumbing.com) — 图片优化（WebP 转换）
- [medium-zoom](https://github.com/francoischalifour/medium-zoom) — 图片灯箱
