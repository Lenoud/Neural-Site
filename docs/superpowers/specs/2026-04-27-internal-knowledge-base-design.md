# 内部知识库设计文档

## 背景

基于 short-star 项目（Astro 6 + force-graph），构建面向 20+ 人开发团队的内部知识库。
部署到公司 GitLab CE 托管，CI/CD 推送到内部 Nginx 服务器。

## 技术栈

- **框架**: Astro 6（静态站点生成）
- **图谱**: force-graph（已集成）
- **搜索**: Pagefind
- **部署**: GitLab CI → rsync → Nginx
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

```
src/content/notes/
├── 入门/
│   ├── 快速开始.md
│   └── 安装部署.md
├── 技术文档/
│   ├── API规范.md
│   └── 架构设计.md
├── 流程规范/
│   ├── 代码规范.md
│   └── 发布流程.md
├── 会议记录/
│   └── 2024-04-技术评审.md
└── 故障复盘/
    └── 2024-03-服务宕机.md
```

### Frontmatter Schema

```typescript
// src/content.config.ts
const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string(),                        // 必填，显示标题
    tags: z.array(z.string()).optional(),     // 可选，分类筛选
    order: z.number().optional(),             // 可选，同目录排序权重，默认按文件名排序
  }),
});
```

### 命名约束

- **所有 md 文件名必须全局唯一**，不允许不同目录下存在同名文件
- 这确保 `[[文件名]]` 链接能无歧义地解析到唯一目标
- slug 格式：`入门/快速开始.md` → slug 为 `入门/快速开始`

### 双向链接

- `[[文件名]]` 链接到同名文档（不含路径），如 `[[API规范]]` → `技术文档/API规范.md`
- 渲染为 `<a href="/notes/技术文档/API规范">API规范</a>`
- 目标不存在时显示为灰色虚线样式
- **实现方式**：自定义 remark 插件（`remark-wikilinks`），在 Markdown AST 层将 `[[...]]` 转换为 `<a>` 标签，构建时用 slug map 做解析

## 路由

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

集成 Pagefind，Astro 构建后自动生成索引。
- 需要开启 CJK 模式以支持中文分词：`npx pagefind --site dist --language zh`
- 搜索 UI 组件放在左侧导航栏顶部

## 左侧导航

- 从 `src/content/notes/` 的目录结构自动生成树形导航
- 目录名即为一级分类（入门、技术文档、流程规范...）
- 目录内按 `order` 字段排序，无 `order` 则按文件名排序
- 当前页面高亮，目录支持展开/折叠

## 部署

### GitLab CI/CD

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
    - your-runner
```

### Nginx 配置

- 根目录 `/var/www/kb/`
- Astro 静态输出，每个路由预渲染为独立 HTML 文件
- `try_files $uri $uri.html $uri/ =404`（纯静态匹配，不需要 SPA 回退）
- 绑定内网域名 `http://kb.your-company.internal`

### 权限

- GitLab 仓库权限控制编辑（谁能 push main）
- Nginx 侧只读，全员可浏览
