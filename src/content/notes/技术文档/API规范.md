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
