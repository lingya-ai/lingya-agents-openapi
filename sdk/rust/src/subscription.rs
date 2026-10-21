//! A single owned connection with explicit closure and no automatic reconnection.
use futures_util::{Stream, StreamExt};
use std::{pin::Pin, task::{Context, Poll}};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};
use tokio::sync::{mpsc, watch};
use tokio_util::sync::CancellationToken;
use crate::{ApiError, AiChatBriefEvent, bound_api::AiChatEventStream};
/// Transport chosen explicitly by the caller.
#[derive(Clone, Copy, Debug, Default)]
pub enum StreamTransport { /// HTTP SSE.
    #[default] Sse, /// Read-only WebSocket.
    WebSocket }
/// Final connection state. A transport completion does not synthesize End.
#[derive(Clone, Debug)]
pub struct StreamCloseInfo { /// Stable closure reason.
    pub reason: String }
/// A subscription is a Stream and owns its connection. Drop closes it.
pub struct ChatSubscription { receiver: mpsc::Receiver<Result<AiChatBriefEvent, ApiError>>, cancellation: CancellationToken, closed: watch::Receiver<Option<StreamCloseInfo>>, explicit_close: Arc<AtomicBool>, terminal_cancel: bool }
impl ChatSubscription {
    pub(crate) fn new(mut stream: AiChatEventStream, cancellation: CancellationToken) -> Self {
        let (tx, receiver) = mpsc::channel(64); let (closed_tx, closed) = watch::channel(None);
        let child = cancellation.clone();
        let explicit_close = Arc::new(AtomicBool::new(false));
        let requested = explicit_close.clone();
        tokio::spawn(async move {
            let mut reason = "normal";
            loop {
                let next = tokio::select! { biased; _ = child.cancelled() => { reason = if requested.load(Ordering::Acquire) { "closed" } else { "cancelled" }; break; }, value = stream.next() => value };
                let Some(value) = next else { break; };
                if let Err(ApiError::TransportComplete(completion)) = &value { reason = *completion; break; }
                let end = value.as_ref().is_ok_and(|e| e.event_type() == "end");
                let failed = value.is_err();
                if failed { reason = match value.as_ref().err() { Some(ApiError::Timeout) => "timeout", Some(ApiError::Cancelled) => "cancelled", _ => "error" }; }
                let sent = tokio::select! { biased; _ = child.cancelled() => { reason = if requested.load(Ordering::Acquire) { "closed" } else { "cancelled" }; break; }, result = tx.send(value) => result };
                if sent.is_err() { reason = "closed"; break; }
                if end { reason = "end"; break; }
                if failed { break; }
            }
            drop(stream);
            let _ = closed_tx.send(Some(StreamCloseInfo { reason: reason.into() }));
        });
        Self { receiver, cancellation, closed, explicit_close, terminal_cancel: false }
    }
    /// Close the owned connection; never cancels the parent's token.
    pub fn close(&self) { self.explicit_close.store(true, Ordering::Release); self.cancellation.cancel(); }
    /// Wait for resource release, independently of event consumption.
    pub async fn closed(&self) -> StreamCloseInfo {
        let mut receiver = self.closed.clone();
        loop { if let Some(value) = receiver.borrow().clone() { return value; } if receiver.changed().await.is_err() { return StreamCloseInfo { reason: "closed".into() }; } }
    }
}
impl Stream for ChatSubscription { type Item = Result<AiChatBriefEvent, ApiError>; fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> { if self.cancellation.is_cancelled() {
        if self.explicit_close.load(Ordering::Acquire) || self.terminal_cancel { return Poll::Ready(None); }
        self.terminal_cancel = true; return Poll::Ready(Some(Err(ApiError::Cancelled)));
    }
    self.receiver.poll_recv(cx) } }
impl Drop for ChatSubscription { fn drop(&mut self) { self.close(); } }
