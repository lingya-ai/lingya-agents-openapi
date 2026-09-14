# Lingya Agents OpenAPI 契约

本仓库是 Lingya Agents HMAC 公共渠道接口的唯一 OpenAPI 3.1 契约源，覆盖 `/api/agents/channel/openapi/v1/{channelId}/chat` 下的 46 个操作，不包含使用 Studio JWT 的管理接口。

## 校验与构建

```bash
npm ci
npm run check
npm run generate:docs
```

源契约为 `openapi/lingya-agents-v1.yaml`，JSON 与 HTML 文档由脚本确定性生成。

每次请求必须携带 `X-OpenAPI-AK`、`X-OpenAPI-Timestamp`、`X-OpenAPI-Nonce`、`X-OpenAPI-User` 和 `X-OpenAPI-Signature`。签名原文和标准向量见契约与 `test-vectors/hmac-v1.json`。

访问密钥只能保存在可信服务端，禁止写入浏览器、移动端或其他不可信客户端。
