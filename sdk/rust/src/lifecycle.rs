//! Per-operation cancellation and total deadlines.
use std::{future::Future, time::Duration};
use tokio::time::Instant;
use tokio_util::sync::CancellationToken;
use crate::client::ApiError;
/// Options apply to one request or one stream, including authentication.
#[derive(Clone, Debug, Default)]
pub struct RequestOptions {
    /// Stream transport; SSE is the default.
    pub transport: crate::subscription::StreamTransport,
    /// Total operation timeout; None means no total deadline.
    pub timeout: Option<Duration>,
    /// Explicit cancellation; dropping a future also cancels its transport.
    pub cancellation: CancellationToken,
    /// Optional maximum gap between visible stream chunks/frames.
    pub idle_timeout: Option<Duration>,
    /// Optional observer. Exceptions in other languages likewise do not own protocol state.
    pub on_connection_event: Option<ConnectionObserver>,
}
#[derive(Clone, Debug)]
pub(crate) struct RequestScope { options: RequestOptions, deadline: Option<Instant> }
impl RequestScope {
    pub(crate) fn new(options: &RequestOptions) -> Self {
        Self { options: options.clone(), deadline: options.timeout.map(|t| Instant::now() + t) }
    }
    pub(crate) async fn run<T>(&self, future: impl Future<Output = Result<T, ApiError>>) -> Result<T, ApiError> {
        tokio::select! { biased;
            _ = self.options.cancellation.cancelled() => Err(ApiError::Cancelled),
            _ = async { match self.deadline { Some(t) => tokio::time::sleep_until(t).await, None => std::future::pending().await } } => Err(ApiError::Timeout),
            value = future => value,
        }
    }
    pub(crate) async fn read<T>(&self, future: impl Future<Output = Result<T, ApiError>>) -> Result<T, ApiError> {
        self.run(async {
            match self.options.idle_timeout { Some(t) => tokio::time::timeout(t, future).await.map_err(|_| ApiError::Timeout)?, None => future.await }
        }).await
    }
}
/// A download retains bytes and the headers actually visible to its transport.
#[derive(Clone, Debug)]
pub struct DownloadResponse {
    /// Unmodified bytes.
    pub bytes: Vec<u8>,
    /// Content-Disposition filename, preferring UTF-8 filename*.
    pub filename: Option<String>,
    /// Content-Type header.
    pub content_type: Option<String>,
    /// All response headers.
    pub headers: reqwest::header::HeaderMap,
    /// HTTP status.
    pub status: u16,
    /// Server request identifier, when supplied.
    pub request_id: Option<String>,
}
impl DownloadResponse {
    pub(crate) fn from_parts(bytes: Vec<u8>, status: u16, headers: reqwest::header::HeaderMap) -> Self {
        let disposition = headers.get("Content-Disposition").and_then(|v| v.to_str().ok()).unwrap_or_default();
        let parts: Vec<_> = disposition.split(';').map(str::trim).collect();
        let filename = parts.iter().find_map(|p| p.strip_prefix("filename*=UTF-8''")).map(|v| percent_encoding::percent_decode_str(v).decode_utf8_lossy().into_owned())
            .or_else(|| parts.iter().find_map(|p| p.strip_prefix("filename=")).map(|v| v.trim_matches('"').to_owned()));
        Self { bytes, filename, status, content_type: headers.get("Content-Type").and_then(|v| v.to_str().ok()).map(str::to_owned),
            request_id: headers.get("X-Request-ID").and_then(|v| v.to_str().ok()).map(str::to_owned), headers }
    }
}

/// Connection diagnostics contain no credentials.
#[derive(Clone, Debug)]
pub struct ConnectionEvent { /// opened, ready, heartbeat or closed.
    pub event: String, /// sse or websocket.
    pub transport: String, /// Server identifier, when exposed.
    pub request_id: Option<String>, /// Local identifier, independent of the server request ID.
    pub connection_id: Option<String>, /// Closure reason when available.
    pub reason: Option<String> }
/// Concurrent diagnostic observer.
#[derive(Clone)]
pub struct ConnectionObserver(pub std::sync::Arc<dyn Fn(ConnectionEvent) + Send + Sync>);
impl std::fmt::Debug for ConnectionObserver { fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { f.write_str("ConnectionObserver") } }



pub(crate) struct ConnectionGuard {
    options: RequestOptions,
    transport: &'static str,
    request_id: Option<String>,
    connection_id: String,
    pub(crate) reason: &'static str,
}
impl ConnectionGuard {
    pub(crate) fn new(options: &RequestOptions, transport: &'static str, request_id: Option<String>) -> Self {
        static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);
        let guard = Self { options: options.clone(), transport, request_id, connection_id: format!("connection-{}", NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed)), reason: "closed" };
        guard.notify("opened"); guard
    }
    pub(crate) fn set_reason(&mut self, reason: &'static str) { self.reason = reason; }
    pub(crate) fn notify(&self, event: &str) {
        if let Some(observer) = &self.options.on_connection_event {
            let value = ConnectionEvent { event: event.into(), transport: self.transport.into(), request_id: self.request_id.clone(), connection_id: Some(self.connection_id.clone()), reason: if event == "closed" { Some(self.reason.into()) } else { None } };
            let _ = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| (observer.0)(value)));
        }
    }
}
impl Drop for ConnectionGuard { fn drop(&mut self) { self.notify("closed"); } }
