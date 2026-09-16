# 灵涯 Agents OpenAPI
Lingya Agents OpenAPI

这是灵涯 Agents 渠道签名 API 的唯一 OpenAPI 3.1 契约源，覆盖 `/api/agents/channel/openapi/v1/{channelId}/chat` 基础路径下的 46 个操作，不包含 Studio 管理接口。
This is the canonical OpenAPI 3.1 contract for the signed Lingya Agents channel API. It covers the 46 operations under `/api/agents/channel/openapi/v1/{channelId}/chat` and intentionally excludes Studio administration endpoints.

在线接口文档提供十个业务分组的使用场景、全部接口的 Raw HTTP、cURL 以及请求和响应示例：[打开在线文档](https://lingya-ai.github.io/lingya-agents-openapi/)。
The online API reference provides use cases for all ten business groups plus Raw HTTP, cURL, request, and response examples for every operation: [open the online reference](https://lingya-ai.github.io/lingya-agents-openapi/).

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

`examples/http-requests.json` 是从契约生成的 46 个接口完整示例清单，禁止手工修改。
`examples/http-requests.json` is the generated example manifest for all 46 operations and must not be edited manually.

`openapi/endpoints.json` 为 SDK 提供完整 operation manifest；其中 `channelId` 标记为根客户端绑定参数，不会从 HTTP 契约中删除。
`openapi/endpoints.json` provides the complete SDK operation manifest; it marks `channelId` as root-client-bound without removing it from the HTTP contract.

## 认证
Authentication

每个请求都要发送 `X-OpenAPI-AK`、`X-OpenAPI-Timestamp`、`X-OpenAPI-Nonce`、`X-OpenAPI-User` 和 `X-OpenAPI-Signature`；规范化签名输入记录在契约中，并由 `test-vectors/hmac-v1.json` 验证。
Every request sends `X-OpenAPI-AK`, `X-OpenAPI-Timestamp`, `X-OpenAPI-Nonce`, `X-OpenAPI-User`, and `X-OpenAPI-Signature`. The canonical signing input is documented in the contract and verified by `test-vectors/hmac-v1.json`.

切勿在浏览器或不受信任的客户端中暴露访问密钥。
Never expose the access secret to a browser or an untrusted client.

## 本地签名工具
Local signing tool

签名工具只从环境变量读取凭证，输出短期请求头，不会输出 secret 或发送网络请求。
The signing tool reads credentials only from environment variables, emits short-lived request headers, and never prints the secret or sends a network request.

```bash
export OPENAPI_AK="your-access-key"
export OPENAPI_SK="your-secret-key"
node scripts/sign-request.mjs \
  --method GET \
  --path /api/agents/channel/openapi/v1/11111111-2222-4333-8444-555555555555/chat/config \
  --user external-user-demo \
  --format curl
```

如需 JSON 或可供 shell 载入的输出，可将 `--format` 改为 `json` 或 `shell`。
For JSON or shell-loadable output, set `--format` to `json` or `shell`.

## 发布产物
Release artifacts

每个契约版本都会附带 YAML、JSON、端点清单、单文件 HTML、完整 HTTP 示例和签名工具。
Every contract release includes YAML, JSON, the endpoint manifest, single-file HTML, the complete HTTP example manifest, and the signing tool.

如需独立的中文文档，可参阅 [README.zh-CN.md](README.zh-CN.md)。
For the standalone Chinese documentation, see [README.zh-CN.md](README.zh-CN.md).
