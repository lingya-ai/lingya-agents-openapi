# 灵涯 Agents OpenAPI
Lingya Agents OpenAPI

这是灵涯 Agents 渠道签名 API 的唯一 OpenAPI 3.1 契约源，覆盖 `/api/agents/channel/openapi/v1/{channelId}/chat` 基础路径下的 64 个操作，不包含 Studio 管理接口。
This is the canonical OpenAPI 3.1 contract for the signed Lingya Agents channel API. It covers the 64 operations under `/api/agents/channel/openapi/v1/{channelId}/chat` and intentionally excludes Studio administration endpoints.

在线接口文档提供十个业务分组的使用场景、全部接口的 Raw HTTP、cURL 以及请求和响应示例：[打开在线文档](https://lingya-ai.github.io/lingya-agents-openapi/)。
The online API reference provides use cases for all ten business groups, a signing-rules guide for direct HTTP clients, and Raw HTTP, cURL, request, and response examples for every operation: [open the online reference](https://lingya-ai.github.io/lingya-agents-openapi/).

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

`examples/http-requests.json` 是从契约生成的 64 个接口完整示例清单，禁止手工修改。
`examples/http-requests.json` is the generated example manifest for all 64 operations and must not be edited manually.

`openapi/endpoints.json` 为 SDK 提供完整 operation manifest；其中 `channelId` 标记为根客户端绑定参数，不会从 HTTP 契约中删除。
`openapi/endpoints.json` provides the complete SDK operation manifest; it marks `channelId` as root-client-bound without removing it from the HTTP contract.

## 认证
Authentication

HMAC 模式的请求发送 `X-OpenAPI-AK`、`X-OpenAPI-Timestamp`、`X-OpenAPI-Nonce`、`X-OpenAPI-User` 和 `X-OpenAPI-Signature`；规范化签名输入记录在契约中，并由 `test-vectors/hmac-v1.json` 验证。
HMAC requests send `X-OpenAPI-AK`, `X-OpenAPI-Timestamp`, `X-OpenAPI-Nonce`, `X-OpenAPI-User`, and `X-OpenAPI-Signature`. The canonical signing input is documented in the contract and verified by `test-vectors/hmac-v1.json`.

客户端可使用可信业务服务端签发的一次性令牌。服务端通过空请求体、HMAC 签名的 `POST /chat/presign` 获取 `token` 和 `expiresAt`。令牌绑定当前渠道和用户，十分钟内仅能认证一次；认证成功即消费，即使后续业务失败也不能重用。每个新请求、重试及 SSE/WebSocket 重连必须获取新令牌；不要按有效期缓存或让并发请求共享令牌。`expiresAt` 限制建立连接时的认证，不是已建立流的存活时间。
Clients may use a single-use token issued by a trusted business server through an empty, HMAC-signed `POST /chat/presign`. The returned `token` and `expiresAt` identify a token bound to the current channel and user, valid for one authentication within ten minutes. Successful authentication consumes it even if the business operation fails. Obtain a fresh token for every request, retry, and SSE/WebSocket reconnection; never cache it by expiry or share it between concurrent requests. Expiry limits connection authentication, not the lifetime of an established stream.

HTTP 令牌请求仅携带 `X-OpenAPI-Token`，不得混用 HMAC 鉴权头，也不能调用 `/presign`。例如，以下请求使用一枚新签发的令牌读取配置：
HTTP token requests send `X-OpenAPI-Token` without HMAC authentication headers and cannot call `/presign`. For example, use a newly issued token to read configuration:

```http
GET /api/agents/channel/openapi/v1/11111111-2222-4333-8444-555555555555/chat/config HTTP/1.1
Host: api.example.com
Accept: application/json
X-OpenAPI-Token: <fresh-single-use-token>
```

WebSocket 令牌认证通过 `xlt-openapi-token.<token>` 子协议传递；HMAC 握手使用签名请求头。每次新连接重新获取令牌，SDK 不自动重连。

SDK 回调构造方案见 [AgentsClient 认证设计](docs/agents-client-auth-design.md)。
See the implemented [AgentsClient authentication design](docs/agents-client-auth-design.md).

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

每个契约版本的发布配置附带 YAML、JSON、端点及传输清单、单文件 HTML、完整 HTTP 示例、签名工具，以及包含 SDK 运行时、模板和生成输入的 `sdk-generation.tar.gz`。
The release workflow bundles YAML, JSON, endpoint and transport manifests, single-file HTML, HTTP examples, signing tools, and sdk-generation.tar.gz with SDK runtimes, templates, and generation inputs.

如需独立的中文文档，可参阅 [README.zh-CN.md](README.zh-CN.md)。
For the standalone Chinese documentation, see [README.zh-CN.md](README.zh-CN.md).

本地运行 `npm run generate:sdks`（兼容入口 `npm run sync:sdks`）完成四个 SDK 的契约同步、模型/API 生成、运行时和门面装配，无需在 SDK 中再次单独生成。
Run `npm run generate:sdks` (or the compatible `npm run sync:sdks`) to synchronize contracts and generate models, APIs, runtimes, and facades for all four sibling SDKs in one step.


## 四语言 SDK 生成

`npm run generate:sdks` 构建契约并生成模型、API、运行时与业务门面；`sync:sdks` 为兼容入口。运行时源文件、模板和构建输入集中在 `sdk/`，生成清单记录在各 SDK 的 `SDK_GENERATION.json`；SDK 日常构建无需重新生成。详见 [请求生命周期和生成机制](docs/request-lifecycle.md)。
