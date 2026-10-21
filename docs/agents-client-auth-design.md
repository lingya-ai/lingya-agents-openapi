# AgentsClient 认证构造与一次性令牌

四种 SDK 已实现回调认证：TypeScript 使用选项对象构造，Python 使用 auth 关键字，Kotlin 使用 AgentsClientOptions，Rust 使用 with_auth。现有 AK/SK 构造方式保持兼容；具体示例见各 SDK README。

## 推荐构造接口

以 TypeScript 表达统一选项，四种语言保持相同语义：

```ts
import type { WebSocketFactory } from '@lingya-ai/agents-sdk/browser';

type TokenProvider = (context: {
    channelId: string;
    signal?: AbortSignal;
    fetch: typeof fetch;
}) => string | Promise<string>;

type AgentsClientOptions = {
    baseUrl: string;
    channelId: string;
    fetch?: typeof fetch;
    webSocketFactory?: WebSocketFactory;
    auth:
        | {
            type: 'hmac';
            accessKey: string;
            secretKey: string;
            externalUserId: string;
        }
        | {
            type: 'token';
            tokenProvider: TokenProvider;
        };
};
```

已新增 `new AgentsClient(options)`，并在这个已绑定身份的客户端直接提供 `chat`、`configuration` 等业务分组。HMAC 模式从选项绑定用户；token 模式使用令牌内绑定的身份，不接收或发送 `externalUserId`。使用类型联合避免混传两类凭证，也不提供静态 `token: string` 选项，减少误复用。

现有 `new AgentsClient(baseUrl, channelId, credentials).forUser(externalUserId)` 保留作为兼容重载，继续使用现有 HMAC 行为。新增选项构造后的客户端不再通过 `forUser` 切换身份；需要切换用户时创建新实例。共享业务分组和 transport 通过内部公共对象复用，避免两套 API 实现。四种语言均需保持原有构造方式兼容。

TypeScript 客户端用法：

```ts
const client = new AgentsClient({
    baseUrl: 'https://agents.example.com',
    channelId,
    auth: {
        type: 'token',
        tokenProvider: async ({ fetch, signal }) => {
            // 自己的业务服务端验证当前登录用户，再用服务端 SDK 签发一枚新令牌。
            // URL 只是业务服务示例，不是 OpenAPI 新增接口。
            const response = await fetch('/api/agents-token', {
                method: 'POST',
                credentials: 'same-origin',
                signal,
            });
            if (!response.ok) throw new Error('获取 OpenAPI 令牌失败');
            const result: { token: string } = await response.json();
            return result.token;
        },
    },
});

const config = await client.configuration.getAgentsConfig();
```

业务服务端保留 AK/SK，通过当前的 `forUser(当前登录用户映射出的稳定 ID).configuration.createOpenApiToken()` 签发。令牌接口必须从登录态确定用户和允许访问的渠道；回调闭包固定相同渠道与登录身份。SDK 无需知道业务系统使用 Cookie、JWT 还是其他会话机制。

## 请求生命周期

1. 完成参数校验、路径和 body 构造，检查取消状态。此阶段不获取令牌。
2. 每次实际发送前独立调用并等待 `tokenProvider`。并发请求各调用一次，不缓存、不合并回调、不共享正在获取的 Promise。
3. 校验返回的是非空字符串且不含非法请求头字符，HTTP 请求设置 `X-OpenAPI-Token`，WebSocket 使用 `xlt-openapi-token.<token>` 子协议；不发送任何 HMAC 鉴权头。回调失败或返回无效值时不发送业务请求，错误消息不包含令牌。
4. 按业务 API 处理 JSON、下载、SSE 或 WebSocket 事件。SDK 不解析令牌内部载荷、不在本地验证身份，也不自动回退到 HMAC。
5. 不新增自动重试，包括 401。网络失败无法确定业务是否执行，写请求不能因此重复发送。调用方明确重试时，重新调用回调并获取新令牌。

`expiresAt` 无需作为必填回调返回值：SDK 每次即时获取并立即使用，不按有效期缓存。可选的过期时间包装类型可在确有需求时增加，不能改变一次性语义。

`createOpenApiToken` 只能在 HMAC 模式下执行；token 模式在本地明确拒绝，且不调用回调，防止递归签发。应用不能让回调调用同一个 token 客户端来获取令牌。

## 流和浏览器支持

SSE 获取一次令牌后通过支持请求头的 fetch transport 建立连接，逐条读取事件不再次调用回调。若明确重新连接，则获取新令牌。当前无自动重连，保留该行为。

WebSocket 订阅在每次连接前执行回调，浏览器通过 `xlt-openapi-token.<token>` 子协议传递；不要放进 URL。每次重连都重新获取，不按事件数获取。

TypeScript 的 Node 入口保留 HMAC 模块及 `node:crypto` 依赖；浏览器使用独立入口/条件导出，使浏览器依赖图不包含 Node HMAC 模块。浏览器入口只接受 token 认证，Node 入口接受两种认证，沿用同一个 `AgentsClient` 名称。浏览器还需要实际部署的 CORS 允许业务页面来源和 `X-OpenAPI-Token`；这属于服务部署配置。

Python `AgentsClient` 使用同步回调，已实现的 `AsyncAgentsClient` 使用异步回调。同步回调只能协作取消；异步客户端取消时立即停止等待并丢弃迟到令牌。Kotlin 协程客户端使用挂起回调，blocking facade 在现有阻塞边界桥接；Rust 使用返回 Future 的回调。回调都必须允许并发独立签发，并避免在 Debug/toString/异常中展示令牌。

## 实现验收

- 现有 HMAC 签名及接口行为保持通过。
- 每个普通请求调用一次回调，两个并发请求获取两个独立令牌。
- Token 请求不含 HMAC 头，不能通过额外请求头覆盖认证方式。
- 空令牌、非法头字符、回调异常、取消和 presign 拒绝均不发送业务请求。
- 401 和网络失败不会自动重试；手动重试重新获取令牌。
- SSE/WebSocket 在连接期间不重复获取，重新建立连接时获取新令牌。
- 浏览器产物实际构建及 HTTP/SSE/WebSocket 验证通过，依赖图不含 `node:crypto`；日志和错误不泄露 token。


请求选项、流结束语义与生成机制详见 [请求生命周期](request-lifecycle.md)。
