//! HMAC 请求构造与可信服务端客户端。

use std::fmt;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use async_stream::try_stream;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use futures_util::{Stream, StreamExt, SinkExt};
use hmac::{Hmac, Mac};
use reqwest::{Method, Response, StatusCode};
use serde::de::DeserializeOwned;
use serde::Serialize;
use sha2::{Digest, Sha256};
use thiserror::Error;
use url::form_urlencoded;

use crate::bound_api::{
    ChatApi, ConfigurationApi, ConversationsApi, EventsApi, FilesApi, InteractionsApi,
    KnowledgeApi, MessagesApi, SqlApi, WorkspaceApi,
};
use crate::events::{decode_ai_chat_brief_event, LingyaAiChatBriefEvent};
use crate::models::{AiChatStreamInput, ChatStreamProbeEvent, ChatStreamProbeInput};
use crate::sse::SseDecoder;
use crate::lifecycle::{RequestOptions, RequestScope, DownloadResponse};

type HmacSha256 = Hmac<Sha256>;

/// 服务端 OpenAPI 凭证；调试输出始终隐藏 secret。
#[derive(Clone)]
pub struct OpenApiCredentials {
    /// 公开访问标识。
    pub access_key: String,
    secret_key: String,
}

impl OpenApiCredentials {
    /// 创建一组服务端凭证。
    pub fn new(access_key: impl Into<String>, secret_key: impl Into<String>) -> Self {
        Self {
            access_key: access_key.into(),
            secret_key: secret_key.into(),
        }
    }
}

impl fmt::Debug for OpenApiCredentials {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("OpenApiCredentials")
            .field("access_key", &self.access_key)
            .field("secret_key", &"<redacted>")
            .finish()
    }
}

/// Context for each independent token issuance.
#[derive(Clone, Debug)]
pub struct TokenContext {
    /// Channel selected by the client.
    pub channel_id: String,
    /// Cancellation signal for this token issuance.
    pub cancellation: tokio_util::sync::CancellationToken,
}

/// Fresh-token asynchronous callback. Each call must return a newly issued token.
#[derive(Clone)]
pub struct TokenProvider(Arc<TokenCallback>);

type TokenFuture = Pin<Box<dyn Future<Output = Result<String, LingyaError>> + Send>>;
type TokenCallback = dyn Fn(TokenContext) -> TokenFuture + Send + Sync;

impl TokenProvider {
    /// Wrap an asynchronous issuer; no callback results are cached.
    pub fn new<F, Fut>(provider: F) -> Self
    where
        F: Fn(TokenContext) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<String, LingyaError>> + Send + 'static,
    {
        Self(Arc::new(move |context| Box::pin(provider(context))))
    }
}
impl fmt::Debug for TokenProvider {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("TokenProvider(<redacted>)")
    }
}

/// Mutually exclusive authentication modes for an identity-bound client.
#[derive(Clone, Debug)]
pub enum Authentication {
    /// Trusted server authentication bound to an external user.
    Hmac {
        credentials: OpenApiCredentials,
        external_user_id: String,
    },
    /// One new token is acquired per request.
    Token(TokenProvider),
}

/// 保留顺序并允许重复名称的查询参数。
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct QueryParameter {
    /// 查询参数名称。
    pub name: String,
    /// 已编码前的查询参数值。
    pub value: String,
}

impl QueryParameter {
    /// 创建查询参数。
    pub fn new(name: impl Into<String>, value: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            value: value.into(),
        }
    }
}

/// SDK 请求、协议或解码错误；错误文本不包含 secret。
#[derive(Debug, Error)]
pub enum LingyaError {
    /// 服务端返回非 2xx 状态。
    #[error("{method} {path} returned HTTP {status}")]
    Http {
        /// HTTP 方法。
        method: String,
        /// 相对路由，不包含凭证与查询值。
        path: String,
        /// HTTP 状态码。
        status: StatusCode,
        /// 用于诊断的响应正文，最多保留 64 KiB。
        response_body: String,
        /// Server request identifier.
        request_id: Option<String>,
    },
    /// Caller cancelled the operation.
    #[error("operation cancelled")]
    Cancelled,
    /// Total or idle deadline elapsed.
    #[error("operation timed out")]
    Timeout,
    /// Invalid transport frame or response media type.
    #[error("transport protocol error")]
    Protocol,
    /// Chat stream ended before End.
    #[error("unexpected end of stream")]
    UnexpectedEof,
    /// Transport control completion, consumed internally by subscriptions.
    #[doc(hidden)]
    #[error("stream completed")]
    TransportComplete(&'static str),
    /// A transport-error frame, distinct from a business error event.
    #[error("{message}")]
    StreamTransportError { /// Server business code.
        code: Option<String>, /// Server message.
        message: String },
    /// WebSocket transport failed.
    #[error("WebSocket transport failed")]
    WebSocket,
    /// HTTP transport 失败。
    #[error("HTTP transport failed")]
    Transport(#[from] reqwest::Error),
    /// JSON 序列化或反序列化失败。
    #[error("JSON processing failed")]
    Json(#[from] serde_json::Error),
    /// SSE 中存在无效 UTF-8。
    #[error("SSE stream contains invalid UTF-8")]
    Utf8(#[from] std::str::Utf8Error),
    /// 调用参数违反协议限制。
    #[error("invalid SDK input: {0}")]
    InvalidInput(String),
}

/// Lingya Agents SDK 入口。
#[derive(Clone, Debug)]
pub struct LingyaAgentsClient {
    base_url: String,
    channel_id: String,
    credentials: Option<OpenApiCredentials>,
    bound: Option<LingyaAgentsUserClient>,
    options: RequestOptions,
    http: Option<reqwest::Client>,
}

impl LingyaAgentsClient {
    /// Apply request options to an identity-bound root client.
    pub fn with_request_options(&self, options: RequestOptions) -> Self { let mut copy = self.clone(); copy.options = options.clone(); copy.bound = self.bound.as_ref().map(|v| v.with_request_options(options)); copy }
    /// Inject a transport for an identity-bound root client.
    pub fn with_http_client(&self, http: reqwest::Client) -> Self { let mut copy = self.clone(); copy.http = Some(http.clone()); copy.bound = self.bound.as_ref().map(|v| v.with_http_client(http)); copy }

    /// 创建客户端。base URL 不应包含 `/api/.../chat` 路径。
    pub fn new(
        base_url: impl Into<String>,
        channel_id: impl Into<String>,
        credentials: OpenApiCredentials,
    ) -> Result<Self, LingyaError> {
        let channel_id = channel_id.into();
        if channel_id.is_empty() {
            return Err(LingyaError::InvalidInput(
                "channel_id must not be empty".into(),
            ));
        }
        Ok(Self {
            base_url: base_url.into().trim_end_matches('/').to_owned(),
            channel_id,
            credentials: Some(credentials),
            bound: None,
            options: RequestOptions::default(),
            http: None,
        })
    }

    /// Construct an identity-bound client with HMAC or a fresh-token callback.
    pub fn with_auth(
        base_url: impl Into<String>,
        channel_id: impl Into<String>,
        auth: Authentication,
    ) -> Result<Self, LingyaError> {
        let base_url = base_url.into().trim_end_matches('/').to_owned();
        let channel_id = channel_id.into();
        if channel_id.is_empty() {
            return Err(LingyaError::InvalidInput(
                "channel_id must not be empty".into(),
            ));
        }
        let mut client = Self {
            base_url,
            channel_id,
            credentials: None,
            bound: None,
            options: RequestOptions::default(),
            http: None,
        };
        let user = match auth {
            Authentication::Hmac {
                credentials,
                external_user_id,
            } => {
                client.credentials = Some(credentials);
                let user = LingyaAgentsUserClient::new(&client, &external_user_id)?;
                client.credentials = None;
                user
            }
            Authentication::Token(provider) => {
                let channel = form_urlencoded::byte_serialize(client.channel_id.as_bytes())
                    .collect::<String>();
                LingyaAgentsUserClient {
                    root: format!(
                        "{}/api/agents/channel/openapi/v1/{channel}/chat",
                        client.base_url
                    ),
                    credentials: None,
                    encoded_user: String::new(),
                    token_provider: Some(provider),
                    channel_id: client.channel_id.clone(),
                    options: RequestOptions::default(),
                    http: reqwest::Client::builder()
                        .redirect(reqwest::redirect::Policy::none())
                        .retry(reqwest::retry::never())
                        .build()?,
                }
            }
        };
        client.bound = Some(user);
        Ok(client)
    }

    /// 绑定调用方系统中的外部用户身份。
    pub fn for_user(
        &self,
        external_user_id: impl AsRef<str>,
    ) -> Result<LingyaAgentsUserClient, LingyaError> {
        if self.bound.is_some() {
            return Err(LingyaError::InvalidInput(
                "Auth already binds identity; create a new client to switch users".into(),
            ));
        }
        LingyaAgentsUserClient::new(self, external_user_id.as_ref())
    }
    fn user(&self) -> &LingyaAgentsUserClient {
        self.bound
            .as_ref()
            .expect("Call for_user before using a legacy channel client")
    }

    /// Access the identity-bound chat API. Panics on legacy clients; use for_user first.
    pub fn chat(&self) -> ChatApi<'_> {
        self.user().chat()
    }

    /// Access the identity-bound configuration API. Panics on legacy clients; use for_user first.
    pub fn configuration(&self) -> ConfigurationApi<'_> {
        self.user().configuration()
    }

    /// Access the identity-bound conversations API. Panics on legacy clients; use for_user first.
    pub fn conversations(&self) -> ConversationsApi<'_> {
        self.user().conversations()
    }

    /// Access the identity-bound events API. Panics on legacy clients; use for_user first.
    pub fn events(&self) -> EventsApi<'_> {
        self.user().events()
    }

    /// Access the identity-bound files API. Panics on legacy clients; use for_user first.
    pub fn files(&self) -> FilesApi<'_> {
        self.user().files()
    }

    /// Access the identity-bound interactions API. Panics on legacy clients; use for_user first.
    pub fn interactions(&self) -> InteractionsApi<'_> {
        self.user().interactions()
    }

    /// Access the identity-bound knowledge API. Panics on legacy clients; use for_user first.
    pub fn knowledge(&self) -> KnowledgeApi<'_> {
        self.user().knowledge()
    }

    /// Access the identity-bound messages API. Panics on legacy clients; use for_user first.
    pub fn messages(&self) -> MessagesApi<'_> {
        self.user().messages()
    }

    /// Access the identity-bound sql API. Panics on legacy clients; use for_user first.
    pub fn sql(&self) -> SqlApi<'_> {
        self.user().sql()
    }

    /// Access the identity-bound workspace API. Panics on legacy clients; use for_user first.
    pub fn workspace(&self) -> WorkspaceApi<'_> {
        self.user().workspace()
    }
}

/// 已绑定外部用户、可执行 HMAC 请求的异步客户端。
#[derive(Clone, Debug)]
pub struct LingyaAgentsUserClient {
    root: String,
    credentials: Option<OpenApiCredentials>,
    encoded_user: String,
    token_provider: Option<TokenProvider>,
    channel_id: String,
    http: reqwest::Client,
    options: RequestOptions,
}

impl LingyaAgentsUserClient {
    pub(crate) fn subscription_client(&self) -> Self { let mut copy = self.clone(); copy.options.cancellation = self.options.cancellation.child_token(); copy }
    pub(crate) fn stream_transport(&self) -> crate::StreamTransport { self.options.transport }
    pub(crate) fn cancellation(&self) -> tokio_util::sync::CancellationToken { self.options.cancellation.clone() }
    /// Scope options without mutating a shared client or changing existing method signatures.
    pub fn with_request_options(&self, options: RequestOptions) -> Self { let mut copy = self.clone(); copy.options = options; copy }
    /// Inject a configured client. Its middleware must not retry or follow redirects.
    pub fn with_http_client(&self, http: reqwest::Client) -> Self { let mut copy = self.clone(); copy.http = http; copy }

    fn new(client: &LingyaAgentsClient, external_user_id: &str) -> Result<Self, LingyaError> {
        let bytes = external_user_id.as_bytes();
        if bytes.is_empty() || bytes.len() > 256 || bytes.contains(&0) {
            return Err(LingyaError::InvalidInput(
                "external_user_id must contain 1 to 256 UTF-8 bytes and no NUL".into(),
            ));
        }
        let channel =
            form_urlencoded::byte_serialize(client.channel_id.as_bytes()).collect::<String>();
        let http = match &client.http { Some(http) => http.clone(), None => reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none()).retry(reqwest::retry::never())
            .build()? };
        Ok(Self {
            root: format!(
                "{}/api/agents/channel/openapi/v1/{channel}/chat",
                client.base_url
            ),
            credentials: client.credentials.clone(),
            token_provider: None,
            channel_id: client.channel_id.clone(),
            encoded_user: URL_SAFE_NO_PAD.encode(bytes),
            http,
            options: client.options.clone(),
        })
    }

    /// 返回创建聊天和消费实时事件的 channel 绑定接口。
    pub fn chat(&self) -> ChatApi<'_> {
        ChatApi::new(self)
    }

    /// 返回 Agent 与会话配置的 channel 绑定接口。
    pub fn configuration(&self) -> ConfigurationApi<'_> {
        ConfigurationApi::new(self)
    }

    /// 返回会话、状态和分享的 channel 绑定接口。
    pub fn conversations(&self) -> ConversationsApi<'_> {
        ConversationsApi::new(self)
    }

    /// 返回持久化聊天事件的 channel 绑定接口。
    pub fn events(&self) -> EventsApi<'_> {
        EventsApi::new(self)
    }

    /// 返回文件与预签名地址的 channel 绑定接口。
    pub fn files(&self) -> FilesApi<'_> {
        FilesApi::new(self)
    }

    /// 返回计划审批与用户回答的 channel 绑定接口。
    pub fn interactions(&self) -> InteractionsApi<'_> {
        InteractionsApi::new(self)
    }

    /// 返回知识引用元数据的 channel 绑定接口。
    pub fn knowledge(&self) -> KnowledgeApi<'_> {
        KnowledgeApi::new(self)
    }

    /// 返回消息与异步任务的 channel 绑定接口。
    pub fn messages(&self) -> MessagesApi<'_> {
        MessagesApi::new(self)
    }

    /// 返回 SQL 查询与导出的 channel 绑定接口。
    pub fn sql(&self) -> SqlApi<'_> {
        SqlApi::new(self)
    }

    /// 返回会话工作区制品的 channel 绑定接口。
    pub fn workspace(&self) -> WorkspaceApi<'_> {
        WorkspaceApi::new(self)
    }

    /// 返回兼容期的底层客户端。
    #[deprecated(note = "use channel-bound groups; this method will be removed in 1.0")]
    pub fn low_level(&self) -> &Self {
        self
    }

    pub(crate) async fn request_model_internal<T: DeserializeOwned>(
        &self,
        method: Method,
        suffix: &str,
        body: Option<String>,
        query: &[QueryParameter],
    ) -> Result<T, LingyaError> {
        RequestScope::new(&self.options).run(async {
        let response = self
            .raw_response_internal(
                method,
                suffix,
                body.as_deref(),
                query,
                "application/json",
                None,
            )
            .await?;
        Ok(response.json().await?)
        }).await
    }

    /// 调用 GET JSON 接口并反序列化为明确响应类型。
    #[deprecated(note = "use the matching channel-bound group; this method will be removed in 1.0")]
    pub async fn get_model<T: DeserializeOwned>(
        &self,
        suffix: &str,
        query: &[QueryParameter],
    ) -> Result<T, LingyaError> {
        self.request_model_internal(Method::GET, suffix, None, query)
            .await
    }

    /// 调用带 JSON 请求体的接口并反序列化为明确响应类型。
    #[deprecated(note = "use the matching channel-bound group; this method will be removed in 1.0")]
    pub async fn send_model<T: DeserializeOwned, B: Serialize + ?Sized>(
        &self,
        method: Method,
        suffix: &str,
        body: &B,
        query: &[QueryParameter],
    ) -> Result<T, LingyaError> {
        self.request_model_internal(method, suffix, Some(serde_json::to_string(body)?), query)
            .await
    }

    pub(crate) async fn request_status_internal(
        &self,
        method: Method,
        suffix: &str,
        body: Option<String>,
        query: &[QueryParameter],
    ) -> Result<(), LingyaError> {
        RequestScope::new(&self.options).run(async {
        self.raw_response_internal(
            method,
            suffix,
            body.as_deref(),
            query,
            "application/json",
            None,
        )
        .await?;
        Ok(())
        }).await
    }

    pub(crate) async fn request_bytes_internal(
        &self,
        suffix: &str,
        query: &[QueryParameter],
        accept: &str,
    ) -> Result<Vec<u8>, LingyaError> {
        RequestScope::new(&self.options).run(async {
        let response = self
            .raw_response_internal(Method::GET, suffix, None, query, accept, None)
            .await?;
        Ok(response.bytes().await?.to_vec())
        }).await
    }

    pub(crate) async fn download_internal(&self, suffix: &str, query: &[QueryParameter], accept: &str) -> Result<DownloadResponse, LingyaError> {
        RequestScope::new(&self.options).run(async {
            let response = self.raw_response_internal(Method::GET, suffix, None, query, accept, None).await?;
            let status = response.status().as_u16(); let headers = response.headers().clone();
            Ok(DownloadResponse::from_parts(response.bytes().await?.to_vec(), status, headers))
        }).await
    }

    /// 下载完整二进制响应。
    #[deprecated(note = "use the matching channel-bound group; this method will be removed in 1.0")]
    pub async fn request_bytes(
        &self,
        suffix: &str,
        query: &[QueryParameter],
        accept: &str,
    ) -> Result<Vec<u8>, LingyaError> {
        self.request_bytes_internal(suffix, query, accept).await
    }

    pub(crate) async fn raw_response_internal(
        &self,
        method: Method,
        suffix: &str,
        body: Option<&str>,
        query: &[QueryParameter],
        accept: &str,
        request_id: Option<&str>,
    ) -> Result<Response, LingyaError> {
        let method_name = method.as_str().to_owned();
        let request = self
            .signed_request(method, suffix, body, query, accept, request_id)
            .await?;
        let response = self.http.execute(request).await?;
        if response.status().is_success() {
            return Ok(response);
        }
        let status = response.status();
        let request_id = response.headers().get("X-Request-ID").and_then(|v| v.to_str().ok()).map(str::to_owned);
        let mut response_body = response.text().await.unwrap_or_default();
        let mut boundary = response_body.len().min(65_536);
        while !response_body.is_char_boundary(boundary) {
            boundary -= 1;
        }
        response_body.truncate(boundary);
        Err(LingyaError::Http {
            method: method_name,
            path: suffix.to_owned(),
            status,
            response_body,
            request_id,
        })
    }

    /// 发送受控底层请求。请求体必须是最终签名所用的 UTF-8 JSON 字节。
    #[deprecated(
        note = "use low_level or a channel-bound group; this method will be removed in 1.0"
    )]
    pub async fn raw_response(
        &self,
        method: Method,
        suffix: &str,
        body: Option<&str>,
        query: &[QueryParameter],
        accept: &str,
    ) -> Result<Response, LingyaError> {
        self.raw_response_internal(method, suffix, body, query, accept, None)
            .await
    }

    pub(crate) async fn stream_chat_events_internal(
        &self,
        conversation_id: &str,
        input: &AiChatStreamInput,
        request_id: Option<&str>,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<LingyaAiChatBriefEvent, LingyaError>> + Send>>,
        LingyaError,
    > {
        let conversation =
            form_urlencoded::byte_serialize(conversation_id.as_bytes()).collect::<String>();
        let suffix = format!("/conversations/{conversation}/stream");
        let body = serde_json::to_string(input)?;
        let scope = RequestScope::new(&self.options);
        let response = scope.run(self
            .raw_response_internal(
                Method::POST,
                &suffix,
                Some(&body),
                &[],
                "text/event-stream",
                request_id,
            )).await?;
        if response.headers().get("Content-Type").and_then(|v| v.to_str().ok()).unwrap_or_default().split(';').next().unwrap_or_default().trim().to_lowercase() != "text/event-stream" { return Err(LingyaError::Protocol); }
        let mut observer = crate::lifecycle::ConnectionGuard::new(&self.options, "sse", response.headers().get("X-Request-ID").and_then(|v| v.to_str().ok()).map(str::to_owned));
        let mut chunks = response.bytes_stream();
        let stream = try_stream! {
            let mut decoder = SseDecoder::default();
            while let Some(chunk) = scope.read(async { Ok(chunks.next().await) }).await? {
                let decoded = decoder.push(&chunk?)?;
                for comment in decoder.take_comments() { observer.notify(if comment == "ready" { "ready" } else { "heartbeat" }); }
                for data in decoded {
                    let event = decode_ai_chat_brief_event(&data)?;
                    if event.event_type() == "end" { observer.set_reason("end"); drop(chunks); drop(observer); yield event; return; }
                    yield event;
                }
            }
            observer.set_reason("error");
            Err(LingyaError::UnexpectedEof)?;
        };
        Ok(Box::pin(stream))
    }

    /// 订阅会话 SSE，逐项返回 15 种强类型事件或未知 raw JSON fallback。
    #[deprecated(note = "use chat().stream_chat_events(conversation_id, input, options)")]
    pub async fn stream_chat_events(
        &self,
        conversation_id: &str,
        message_id: &str,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<LingyaAiChatBriefEvent, LingyaError>> + Send>>,
        LingyaError,
    > {
        self.stream_chat_events_internal(
            conversation_id,
            &AiChatStreamInput::new(message_id.to_owned()),
            None,
        )
        .await
    }

    pub(crate) async fn probe_event_stream_internal(
        &self,
        input: &ChatStreamProbeInput,
        request_id: Option<&str>,
    ) -> Result<
        Pin<Box<dyn Stream<Item = Result<ChatStreamProbeEvent, LingyaError>> + Send>>,
        LingyaError,
    > {
        let body = serde_json::to_string(input)?;
        let scope = RequestScope::new(&self.options);
        let response = scope.run(self
            .raw_response_internal(
                Method::POST,
                "/stream-probe",
                Some(&body),
                &[],
                "text/event-stream",
                request_id,
            )).await?;
        if response.headers().get("Content-Type").and_then(|v| v.to_str().ok()).unwrap_or_default().split(';').next().unwrap_or_default().trim().to_lowercase() != "text/event-stream" { return Err(LingyaError::Protocol); }
        let mut observer = crate::lifecycle::ConnectionGuard::new(&self.options, "sse", response.headers().get("X-Request-ID").and_then(|v| v.to_str().ok()).map(str::to_owned));
        let mut chunks = response.bytes_stream();
        let stream = try_stream! {
            let mut decoder = SseDecoder::default();
            while let Some(chunk) = scope.read(async { Ok(chunks.next().await) }).await? {
                let decoded = decoder.push(&chunk?)?;
                for comment in decoder.take_comments() { observer.notify(if comment == "ready" { "ready" } else { "heartbeat" }); }
                for data in decoded {
                    yield serde_json::from_str::<ChatStreamProbeEvent>(&data)?;
                }
            }
            observer.set_reason("normal");
            for data in decoder.finish()? {
                yield serde_json::from_str::<ChatStreamProbeEvent>(&data)?;
            }
        };
        Ok(Box::pin(stream))
    }

    pub(crate) async fn websocket_events_internal(&self, conversation_id: &str, input: &AiChatStreamInput) -> Result<crate::bound_api::AiChatEventStream, LingyaError> {
        use tokio_tungstenite::tungstenite::{client::IntoClientRequest, Message};
        let scope = RequestScope::new(&self.options);
        let suffix = format!("/conversations/{}/stream/ws", form_urlencoded::byte_serialize(conversation_id.as_bytes()).collect::<String>());
        let request = scope.run(self.signed_request(Method::GET, &suffix, None, &[QueryParameter::new("messageId", &input.message_id)], "application/json", None)).await?;
        let mut url = request.url().clone(); let scheme = if url.scheme() == "https" { "wss" } else { "ws" }; url.set_scheme(scheme).map_err(|_| LingyaError::Protocol)?;
        let mut handshake = url.as_str().into_client_request()?;
        for (name, value) in request.headers() {
            if name.as_str() == "x-openapi-token" {
                let protocol = format!("xlt-openapi-token.{}", value.to_str().map_err(|_| LingyaError::Protocol)?);
                handshake.headers_mut().insert("Sec-WebSocket-Protocol", protocol.parse().map_err(|_| LingyaError::Protocol)?);
            } else if name.as_str().starts_with("x-openapi-") { handshake.headers_mut().insert(name.clone(), value.clone()); }
        }
        let (mut socket, handshake_response) = scope.run(async { Ok(tokio_tungstenite::connect_async(handshake).await?) }).await?;
        let message_id = input.message_id.clone();
        let mut observer = crate::lifecycle::ConnectionGuard::new(&self.options, "websocket", handshake_response.headers().get("X-Request-ID").and_then(|v| v.to_str().ok()).map(str::to_owned));
        Ok(Box::pin(try_stream! {
            let mut ready = false;
            while let Some(frame) = scope.read(async { Ok(socket.next().await) }).await? {
                match frame? {
                    Message::Text(text) => {
                        let envelope: WebSocketEnvelope = serde_json::from_str(&text)?;
                        if envelope.id != message_id { Err(LingyaError::Protocol)?; }
                        match envelope.event.as_str() {
                            "ready" => { ready = true; observer.notify("ready"); },
                            "complete" => { observer.set_reason("complete"); scope.run(async { socket.close(None).await?; Ok(()) }).await?; Err(LingyaError::TransportComplete("complete"))?; }
                            "transport-error" => { let payload: ErrorPayload = serde_json::from_str(envelope.data.as_ref().ok_or(LingyaError::Protocol)?.get())?; Err(LingyaError::StreamTransportError { code: payload.code, message: payload.message.unwrap_or_else(|| "stream failed".into()) })?; }
                            _ if ready => {
                                let event = decode_ai_chat_brief_event(envelope.data.as_ref().ok_or(LingyaError::Protocol)?.get())?;
                                if event.event_type() == "end" { observer.set_reason("end"); socket.close(None).await?; drop(socket); drop(observer); yield event; return; }
                                yield event;
                            }
                            _ => { Err(LingyaError::Protocol)?; }
                        }
                    }
                    Message::Close(frame) => { if frame.as_ref().is_some_and(|f| u16::from(f.code) == 1000) { observer.set_reason("normal"); Err(LingyaError::TransportComplete("normal"))?; } Err(LingyaError::UnexpectedEof)?; }
                    Message::Ping(value) => { socket.send(Message::Pong(value)).await?; }
                    Message::Pong(_) => {}
                    _ => { Err(LingyaError::Protocol)?; }
                }
            }
            Err(LingyaError::UnexpectedEof)?;
        }))
    }

    async fn signed_request(
        &self,
        method: Method,
        suffix: &str,
        body: Option<&str>,
        query: &[QueryParameter],
        accept: &str,
        request_id: Option<&str>,
    ) -> Result<reqwest::Request, LingyaError> {
        let body_bytes = body.unwrap_or_default().as_bytes();
        if body_bytes.len() > 2 * 1024 * 1024 {
            return Err(LingyaError::InvalidInput(
                "request body exceeds the 2 MiB signing limit".into(),
            ));
        }
        let mut query_serializer = form_urlencoded::Serializer::new(String::new());
        for item in query {
            query_serializer.append_pair(&item.name, &item.value);
        }
        let raw_query = query_serializer.finish();
        let url_text = format!(
            "{}{}{}",
            self.root,
            suffix,
            if raw_query.is_empty() {
                String::new()
            } else {
                format!("?{raw_query}")
            }
        );
        let parsed_url = url::Url::parse(&url_text)
            .map_err(|error| LingyaError::InvalidInput(format!("invalid request URL: {error}")))?;
        if let Some(provider) = &self.token_provider {
            if suffix.trim_end_matches('/') == "/presign" {
                return Err(LingyaError::InvalidInput(
                    "presign requires HMAC authentication".into(),
                ));
            }
            let mut builder = self
                .http
                .request(method, parsed_url)
                .header("Accept", accept);
            if let Some(body) = body {
                builder = builder
                    .header("Content-Type", "application/json")
                    .body(body.to_owned());
            }
            if let Some(id) = request_id {
                builder = builder.header("X-Request-ID", id);
            }
            let mut request = builder.build()?;
            let token = (provider.0)(TokenContext {
                channel_id: self.channel_id.clone(),
                cancellation: self.options.cancellation.clone(),
            })
            .await
            .map_err(|_| LingyaError::InvalidInput("OpenAPI token provider failed".into()))?;
            if token.is_empty() || !token.bytes().all(|b| (33..=126).contains(&b)) {
                return Err(LingyaError::InvalidInput("Invalid OpenAPI token".into()));
            }
            let mut header = reqwest::header::HeaderValue::from_str(&token)
                .map_err(|_| LingyaError::InvalidInput("Invalid OpenAPI token".into()))?;
            header.set_sensitive(true);
            request.headers_mut().insert("X-OpenAPI-Token", header);
            return Ok(request);
        }
        let credentials = self
            .credentials
            .as_ref()
            .ok_or_else(|| LingyaError::InvalidInput("Missing HMAC credentials".into()))?;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| LingyaError::InvalidInput("system clock is before Unix epoch".into()))?
            .as_secs()
            .to_string();
        let mut nonce_bytes = [0_u8; 16];
        getrandom::fill(&mut nonce_bytes).map_err(|error| {
            LingyaError::InvalidInput(format!("nonce generation failed: {error}"))
        })?;
        let nonce = URL_SAFE_NO_PAD.encode(nonce_bytes);
        let content_type = if body.is_some() {
            "application/json"
        } else {
            ""
        };
        let body_hash = hex::encode(Sha256::digest(body_bytes));
        let canonical = [
            "OPENAPI-HMAC-SHA256-V1",
            &credentials.access_key,
            &timestamp,
            &nonce,
            method.as_str(),
            parsed_url.path(),
            &raw_query,
            &self.encoded_user,
            content_type,
            &body_hash,
        ]
        .join("\n");
        let signature = sign_canonical(&credentials.secret_key, &canonical)?;
        let mut builder = self
            .http
            .request(method, parsed_url)
            .header("Accept", accept)
            .header("X-OpenAPI-AK", &credentials.access_key)
            .header("X-OpenAPI-Timestamp", timestamp)
            .header("X-OpenAPI-Nonce", nonce)
            .header("X-OpenAPI-User", &self.encoded_user)
            .header("X-OpenAPI-Signature", signature);
        if body.is_some() {
            builder = builder
                .header("Content-Type", content_type)
                .body(body_bytes.to_vec());
        }
        if let Some(request_id) = request_id {
            builder = builder.header("X-Request-ID", request_id);
        }
        Ok(builder.build()?)
    }
}

/// 对固定 canonical string 计算 HMAC，供协议 golden vector 验证。
pub fn sign_canonical(secret_key: &str, canonical: &str) -> Result<String, LingyaError> {
    let mut mac = HmacSha256::new_from_slice(secret_key.as_bytes())
        .map_err(|_| LingyaError::InvalidInput("invalid HMAC key".into()))?;
    mac.update(canonical.as_bytes());
    Ok(hex::encode(mac.finalize().into_bytes()))
}

/// SDK 入口。 / SDK entry point.
pub type AgentsClient = LingyaAgentsClient;
/// 已绑定外部用户的客户端。 / Client bound to one external user.
pub type AgentsUserClient = LingyaAgentsUserClient;
/// 不包含凭证的 API 错误。 / API error that never contains credentials.
pub type ApiError = LingyaError;

impl LingyaError {
    /// Stable classification for UI and application policy.
    pub fn kind(&self) -> &'static str { match self { Self::Http { .. } => "http", Self::Cancelled => "cancelled", Self::Timeout => "timeout", Self::UnexpectedEof => "unexpected_eof", Self::Protocol | Self::Json(_) | Self::Utf8(_) | Self::StreamTransportError { .. } | Self::TransportComplete(_) => "protocol", Self::InvalidInput(message) if message.contains("token") || message.contains("HMAC authentication") => "authentication", Self::InvalidInput(_) => "protocol", Self::Transport(e) if e.is_timeout() => "timeout", _ => "network" } }
    /// HTTP status when a response exists.
    pub fn status(&self) -> Option<u16> { if let Self::Http { status, .. } = self { Some(status.as_u16()) } else { None } }
    /// Server business code, if returned as JSON.
    pub fn code(&self) -> Option<String> { if let Self::StreamTransportError { code, .. } = self { return code.clone(); } if let Self::Http { response_body, .. } = self { serde_json::from_str::<ErrorPayload>(response_body).ok()?.code } else { None } }
    /// Field validation errors.
    pub fn fields(&self) -> Vec<crate::models::FieldError> { if let Self::Http { response_body, .. } = self { serde_json::from_str::<ErrorPayload>(response_body).map(|v| v.fields).unwrap_or_default() } else { Vec::new() } }
    /// Server request identifier.
    pub fn request_id(&self) -> Option<&str> { if let Self::Http { request_id, .. } = self { request_id.as_deref() } else { None } }
}

#[derive(serde::Deserialize)]
struct WebSocketEnvelope {
    id: String,
    event: String,
    data: Option<Box<serde_json::value::RawValue>>,
}
#[derive(serde::Deserialize)]
struct ErrorPayload {
    code: Option<String>,
    message: Option<String>,
    #[serde(default)]
    fields: Vec<crate::models::FieldError>,
}
impl From<tokio_tungstenite::tungstenite::Error> for LingyaError {
    fn from(error: tokio_tungstenite::tungstenite::Error) -> Self {
        match error {
            tokio_tungstenite::tungstenite::Error::Http(response) => Self::Http {
                method: "GET".into(), path: "/stream/ws".into(), status: response.status(),
                request_id: response.headers().get("X-Request-ID").and_then(|v| v.to_str().ok()).map(str::to_owned),
                response_body: String::from_utf8_lossy(response.body().as_deref().unwrap_or_default()).chars().take(65536).collect(),
            },
            _ => Self::WebSocket,
        }
    }
}

impl LingyaError {
    /// Business message when available, otherwise a safe transport description.
    pub fn message(&self) -> String {
        if let Self::Http { response_body, .. } = self {
            if let Ok(payload) = serde_json::from_str::<ErrorPayload>(response_body) {
                if let Some(message) = payload.message { return message; }
            }
        }
        self.to_string()
    }
}
