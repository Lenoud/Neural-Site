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

```yaml
---
title: 代码规范          # 必填，显示标题
tags: [前端, 规范]       # 可选，分类筛选
order: 1                 # 可选，同目录排序权重
---
```

### 双向链接

- `[[文件名]]` 链接到同名文档（不含路径），如 `[[API规范]]` → `技术文档/API规范.md`
- 渲染为 `<a href="/notes/技术文档/API规范">API规范</a>`
- 目标不存在时显示为灰色虚线样式

## 路由

| 路由 | 说明 |
|---|---|
| `/` | 首页，重定向到第一个文档或欢迎页 |
| `/notes/[...slug]` | 动态路由，匹配所有笔记 |
| `/graph` | 全局图谱页面（从右侧 Expand 进入） |

### 右侧面板图谱

- 默认展示 local graph：当前文档 + 一级关联节点
- 点击 Expand → 跳转 `/graph` 展示全局图谱
- force-graph 渲染，嵌入右侧固定容器

### 反向链接

构建时扫描所有文档，找出引用当前文档的来源，显示在 "LINKS TO THIS PAGE" 区域。

## 搜索

集成 Pagefind，Astro 构建后自动生成索引，支持中文全文搜索。

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
- `try_files $uri $uri/ /index.html`（SPA 式回退）
- 绑定内网域名 `http://kb.your-company.internal`

### 权限

- GitLab 仓库权限控制编辑（谁能 push main）
- Nginx 侧只读，全员可浏览
