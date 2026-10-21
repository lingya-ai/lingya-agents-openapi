# 四语言 SDK 0.7.0 本地验证记录

契约版本：0.1.7。SDK 版本：0.7.0。验证日期：2026-10-20。

## 已完成

- 运行时、门面生成器、模板、生成配置及公共协议测试向量统一保存在本仓库 sdk/ 和 test-vectors/，四个 SDK 提交生成源码。
- 固定 OpenAPI Generator 7.25.0 及其 SHA-256，记录运行时和格式化工具版本；受管理文件清单覆盖全部生成产物，保留非管理文件，清理已删除的管理文件。
- 四语言具备一次性 token、取消、总超时、独立空闲超时、分类错误、SSE/WebSocket 订阅和 SQL 下载元数据；保留现有入口和业务事件。
- Python 新增异步客户端；Rust 使用请求选项作用域；Kotlin 保留 Java/Kotlin 兼容重载；TypeScript 浏览器入口支持 Fetch/WebSocket 注入。
- 文档、示例、变更日志和生成 CI 配置已更新。

具体行为和使用方式见 [请求生命周期与订阅](request-lifecycle.md)。

## 本地检查结果

| 项目 | 已通过检查 |
| --- | --- |
| 契约 | npm ci、npm run check；64 个操作、128 个 HTTP 示例；四语言连续两次 generate-sdks.mjs --check 一致 |
| TypeScript | npm ci、npm run check；23 项测试通过、1 项真实服务测试缺少凭证跳过；模型审计、CommonJS/ESM/类型打包及浏览器无 Node 全局变量冒烟 |
| Python | 可编辑安装、ruff check .、mypy、模型审计、pytest -m "not live"（23 项）；sdist/wheel 构建；sdist 包含协议测试向量及生成清单 |
| Rust | cargo fmt --all -- --check、cargo clippy --all-targets -- -D warnings、cargo test --all-targets、cargo package --locked --allow-dirty（因工作区有未提交修改） |
| Kotlin | gradlew clean check、35 项测试；publishToMavenLocal；独立 Java/Kotlin 消费示例构建 |
| 浏览器 | Chromium 155.0.8059.84 真实 HTTP/CORS/SSE/WebSocket、token 回调、取消、超时、下载及连接资源释放 |
| 其他 | 五个仓库 git diff --check、工作流 YAML 解析 |

## 后续验收边界

按用户要求不下载、不执行 Chromium 102。隔离工具固定 playwright-core 1.22.2 / Chromium revision 1005，缺少目标浏览器或主版本不符时检查失败。由用户提供本机可执行文件，通过 CHROMIUM_EXECUTABLE 后运行 TypeScript 仓库的 npm run browser:102。

未执行需要真实服务凭证的后端联调；上述网络行为测试使用本地 HTTP/WebSocket 服务或注入传输。CI 配置已完成，本记录不表示远程 CI 已运行。

未发布远程包、推送提交、创建远程发布或修改前端业务代码。Kotlin 的 Maven 发布仅写入本机仓库。
