# 灵涯 Agents OpenAPI
Lingya Agents OpenAPI

这是灵涯 Agents 渠道签名 API 的唯一 OpenAPI 3.1 契约源，覆盖 `/api/agents/channel/openapi/v1/{channelId}/chat` 基础路径下的 46 个操作，不包含 Studio 管理接口。
This is the canonical OpenAPI 3.1 contract for the signed Lingya Agents channel API. It covers the 46 operations under `/api/agents/channel/openapi/v1/{channelId}/chat` and intentionally excludes Studio administration endpoints.

## 校验与构建
Validation and build

```bash
npm ci
npm run check
npm run generate:docs
```

源契约位于 `openapi/lingya-agents-v1.yaml`；`openapi/lingya-agents-v1.json` 与 `docs/index.html` 是可重复生成的确定性产物。
The source contract is `openapi/lingya-agents-v1.yaml`; `openapi/lingya-agents-v1.json` and `docs/index.html` are deterministic generated artifacts.

请求与响应示例位于 `examples/`，确定性 HMAC 向量与 SSE 线协议样本位于 `test-vectors/`；OpenAPI Generator 通过 `openapitools.json` 固定为 7.25.0。
Request and response examples live in `examples/`; deterministic HMAC vectors and an SSE wire sample live in `test-vectors/`. OpenAPI Generator is pinned to 7.25.0 through `openapitools.json`.

## 认证
Authentication

每个请求都要发送 `X-OpenAPI-AK`、`X-OpenAPI-Timestamp`、`X-OpenAPI-Nonce`、`X-OpenAPI-User` 和 `X-OpenAPI-Signature`；规范化签名输入记录在契约中，并由 `test-vectors/hmac-v1.json` 验证。
Every request sends `X-OpenAPI-AK`, `X-OpenAPI-Timestamp`, `X-OpenAPI-Nonce`, `X-OpenAPI-User`, and `X-OpenAPI-Signature`. The canonical signing input is documented in the contract and verified by `test-vectors/hmac-v1.json`.

切勿在浏览器或不受信任的客户端中暴露访问密钥。
Never expose the access secret to a browser or an untrusted client.

如需独立的中文文档，可参阅 [README.zh-CN.md](README.zh-CN.md)。
For the standalone Chinese documentation, see [README.zh-CN.md](README.zh-CN.md).
