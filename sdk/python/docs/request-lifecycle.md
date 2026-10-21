# SDK 0.7.0 请求生命周期

契约版本为 0.1.7，HTTP 基础路径仍为 `/api/agents/channel/openapi/v1/{channelId}/chat`。SDK 管理认证、传输、协议解析和连接释放；UI 管理重连、历史恢复、缓存、消息归并和渲染。

## 认证和请求作用域

每次业务请求、每次新连接独立调用 token provider。令牌不缓存、不合并，SDK 不自动重放写请求、不自动重连。HMAC 只用于可信服务端；浏览器通过业务服务端取得一次性令牌。token 获取失败归类为 authentication，错误中不输出回调抛出的凭证内容。

TypeScript 的 `fetch` 注入覆盖 HTTP、SSE 和下载，token 上下文同时提供 `fetch` 与 `signal`。WebSocket 使用 `webSocketFactory`；Node HMAC 握手使用签名请求头，浏览器使用 `xlt-openapi-token.<token>` 子协议。浏览器无法取得握手失败的 HTTP 状态，SDK 保留未知状态。浏览器 WebSocket 不能设置自定义握手请求头，因此不能发送 xRequestID；SDK 不会把它改写为查询参数。Node 握手通过请求头传递该值。

所有高级业务方法接受请求选项。TypeScript 将 `signal`、`timeoutMs` 合并到原业务 options；Python 使用末尾 `request_options`；Rust 使用 `with_request_options(...)`；Kotlin 通过兼容重载增加 `RequestOptions`。生成器只选择契约参数，不把生命周期配置发送给服务端。

总超时从实际调用开始，包括 token 获取、握手和响应消费，默认关闭。流的 idle timeout 独立配置，默认关闭。取消会停止等待 token，迟到 token 不再发送请求。Python 同步 token 回调只能协作取消，无法强制终止任意阻塞代码；需要可中断等待时使用 `AsyncAgentsClient`。Python/Kotlin 原生协程取消继续传播原生取消异常。调用方注入的共享 HTTP 客户端不会在单次请求或订阅结束时关闭。

## 订阅和结束

`chat.subscribeChatEvents` / `chat.subscribe_chat_events` 默认 SSE；Rust 在 `RequestOptions.transport` 选择传输，默认 `StreamTransport::Sse`。现有 stream 方法继续可用。订阅提供事件序列、显式 close/aclose、关闭结果和连接诊断；Rust 订阅本身实现 Stream。

- 业务 End 交付一次，立即释放连接，关闭原因 end。
- WebSocket complete 或正常关闭码 1000 结束订阅，不生成 End。
- 聊天 SSE 未收到 End 即 EOF 为 unexpected_eof；有限 stream probe 允许正常 EOF。
- 取消归类为 cancelled，总超时和空闲超时均归类为 timeout，异常断流为 unexpected_eof；主动关闭以 closed 原因结束订阅。Python/Kotlin 的原生协程取消仍传播原生异常。
- 业务 error 仍作为事件交付，未知业务事件保留原始 JSON。

SSE 校验 Content-Type，增量解码 UTF-8，支持 CR、LF、CRLF、注释和心跳，丢弃 EOF 处未闭合帧。提前退出、异常、取消会释放 reader/response 和底层连接。WebSocket 识别 ready、业务帧、complete 和 transport-error，并校验 messageId。浏览器空闲检测只根据可见应用帧，不依赖不可见 ping/pong。

诊断包括 opened、ready、heartbeat、closed 及可取得的服务端 requestId，不包含凭证；本地 connectionId 与服务端 requestId 分开。浏览器仅暴露 CORS 实际可见的响应头。

## 错误和下载

高级 API 的错误入口分别为 ApiError / ApiException，分类为 http、network、authentication、protocol、cancelled、timeout、unexpected_eof。HTTP 错误保留状态、业务 code/message、fields 和 requestId。TypeScript ResponseError、FetchError 保留名称并继承 ApiError；Rust 保留 ApiError/LingyaError 入口及 kind/status/code/fields/request_id/message 访问器。Python/Kotlin 原生取消异常需要单独捕获。

SQL 导出保留原字节方法，增加 WithMetadata / with_metadata 方法，返回原始字节、文件名、Content-Type、响应头、状态和可取得的 requestId。文件名优先 filename*，再回退 filename；仍需传入契约规定的 format。

## 从契约重新生成

运行 `npm ci && npm run generate:sdks`。兼容入口 `npm run sync:sdks` 调用同一流程。`sdk/<language>/` 保存运行时、门面生成器、模板、配置和构建输入；SDK 仓库提交装配后的源码。普通 SDK 构建使用这些已提交源码，无需访问契约仓库或下载生成器。

OpenAPI Generator 固定 7.25.0，并在 `generator.lock.json` 固定 SHA-256、runtime 版本、Ruff 与 rustfmt 工具版本。首次生成缺少 jar 时只下载固定 Maven 生成包并验证摘要。API 和模型参考文档也从当前契约生成，并纳入管理；已移除的内部事件和分享模型不再保留为公开参考。`SDK_GENERATION.json` 记录全部受管理文件及其摘要；生成器只更新受管理文件，并删除上一个清单中已移除的文件。文本统一 LF，避免跨平台摘要漂移。

`node scripts/generate-sdks.mjs --language=typescript --check` 检查已提交源码与重新生成结果。四个 SDK 的 generated CI 对全部受管理文件连续校验两次；契约 CI 独立生成后再校验，检查确定性。升级工作流从固定契约 tag 生成全部源码。契约 release 配置提供 sdk-generation.tar.gz，包含运行时、模板、脚本、契约、测试向量和锁文件。此修改不执行发布。

## 浏览器兼容

SSE 通过 Fetch 响应体的 ReadableStream 和增量 TextDecoder 解析，不需要 TextDecoderStream。浏览器仍需提供 Fetch、Request/Response/Headers、ReadableStream、TextDecoder、AbortController，以及选择 WebSocket 传输时的 WebSocket；SDK 自行组合取消信号并管理计时，不依赖 AbortSignal.any/timeout 或 throwIfAborted。

普通 HTTP、SSE 和下载统一使用构造时注入的 Fetch；token 回调上下文中的 fetch 是同一实现。WebSocket 走独立工厂，不经过 Fetch。CORS 需允许页面来源和认证请求头；下载文件名和服务端请求标识需由服务端通过 Access-Control-Expose-Headers 暴露 Content-Disposition、X-Request-ID 等响应头。

## 浏览器验收

TypeScript `scripts/browser-integration.mjs` 使用隔离的 `test/browser102` 工具项目（playwright-core 1.22.2，对应 Chromium revision 1005），默认要求主版本 102。缺少可执行文件或版本不符时失败，不跳过、不自动下载浏览器。设置 `CHROMIUM_EXECUTABLE` 指向验收浏览器后执行 `npm run browser:102`。

本次按用户要求没有下载或执行 Chromium 102，留待后续验收。已在本机 Chromium 155.0.8059.84 验证真实 HTTP/CORS/SSE/WebSocket、token 回调、取消、超时、下载和资源释放。可用 CHROMIUM_MAJOR 显式指定其他验收版本；SDK 不依赖 TextDecoderStream、AbortSignal.any/timeout 或 throwIfAborted。
