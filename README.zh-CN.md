# Lingya Agents OpenAPI 契约

本仓库是 Lingya Agents 公共渠道接口的唯一 OpenAPI 3.1 契约源，覆盖 `/api/agents/channel/openapi/v1/{channelId}/chat` 下的 64 个操作，不包含使用 Studio JWT 的管理接口。

在线接口文档位于 <https://lingya-ai.github.io/lingya-agents-openapi/>，提供十个业务分组的使用场景、适用于直接 HTTP 调用的签名生成规则，以及全部接口的 Raw HTTP、cURL、请求和响应示例。

## 校验与构建

```bash
npm ci
npm run check
npm run generate:docs
```

源契约为 `openapi/lingya-agents-v1.yaml`，JSON 与 HTML 文档由脚本确定性生成。

HMAC 模式每次请求携带 `X-OpenAPI-AK`、`X-OpenAPI-Timestamp`、`X-OpenAPI-Nonce`、`X-OpenAPI-User` 和 `X-OpenAPI-Signature`。签名原文和标准向量见契约与 `test-vectors/hmac-v1.json`。

客户端也可通过可信业务服务端获取一次性短期令牌：服务端以 HMAC 签名、空请求体调用 `POST /chat/presign`，返回 `token` 和 `expiresAt`。令牌绑定签发时的渠道及用户，十分钟内仅能认证一个新请求；认证成功即消费，后续业务失败也不退还。每次请求、重试及 SSE/WebSocket 重连需重新签发，不得缓存复用或供并发请求共享。截止时间只限制新连接认证，不限制已建立流的存活时间。

HTTP 请求使用令牌时只发送 `X-OpenAPI-Token`，不得混用 HMAC 鉴权头，不能用令牌调用 `/presign`。请求示例见 [README](README.md)，SDK 回调构造方案见 [AgentsClient 认证设计](docs/agents-client-auth-design.md)。

WebSocket 令牌认证通过 `xlt-openapi-token.<token>` 子协议传递；HMAC 握手使用签名请求头。每次新连接重新获取令牌，SDK 不自动重连。

可使用 `node scripts/sign-request.mjs` 在可信服务端本地生成签名请求头；工具不会输出 secret 或发送网络请求。

访问密钥只能保存在可信服务端，禁止写入浏览器、移动端或其他不可信客户端。


## 四语言 SDK 生成

`npm run generate:sdks` 构建契约并生成模型、API、运行时与业务门面；`sync:sdks` 为兼容入口。运行时源文件、模板和构建输入集中在 `sdk/`，生成清单记录在各 SDK 的 `SDK_GENERATION.json`；SDK 日常构建无需重新生成。详见 [请求生命周期和生成机制](docs/request-lifecycle.md)。
