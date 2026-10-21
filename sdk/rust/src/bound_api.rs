//! Channel-bound API groups generated from the Lingya Agents contract.
//!
//! The wire contract keeps `channelId` in every path. These public methods
//! omit it because [`AgentsClient`](crate::AgentsClient) binds it once.

use std::pin::Pin;

use futures_util::Stream;
use reqwest::Method;

use crate::client::{AgentsUserClient, ApiError, QueryParameter};
use crate::events::AiChatBriefEvent;
use crate::models;

/// 可取消的强类型聊天事件流。 / Cancellable strongly typed chat-event stream.
pub type AiChatEventStream = Pin<Box<dyn Stream<Item = Result<AiChatBriefEvent, ApiError>> + Send>>;
/// 可取消的诊断事件流。 / Cancellable diagnostic event stream.
pub type ProbeEventStream =
    Pin<Box<dyn Stream<Item = Result<models::ChatStreamProbeEvent, ApiError>> + Send>>;

/// 排序方向。 / Sort direction.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SortDirection {
    /// 升序。 / Ascending.
    Asc,
    /// 降序。 / Descending.
    Desc,
}

impl SortDirection {
    fn as_str(self) -> &'static str {
        match self {
            Self::Asc => "ASC",
            Self::Desc => "DESC",
        }
    }
}

/// 空值排序策略。 / Null ordering strategy.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NullOrdering {
    /// 使用数据库默认顺序。 / Use the database-native order.
    Native,
    /// 空值优先。 / Nulls first.
    NullsFirst,
    /// 空值最后。 / Nulls last.
    NullsLast,
}

impl NullOrdering {
    fn as_str(self) -> &'static str {
        match self {
            Self::Native => "NATIVE",
            Self::NullsFirst => "NULLS_FIRST",
            Self::NullsLast => "NULLS_LAST",
        }
    }
}

/// SQL 导出格式。 / SQL export format.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SqlExportFormat {
    /// CSV 文本。 / CSV text.
    Csv,
    /// XLSX 工作簿。 / XLSX workbook.
    Xlsx,
}

impl SqlExportFormat {
    fn as_str(self) -> &'static str {
        match self {
            Self::Csv => "CSV",
            Self::Xlsx => "XLSX",
        }
    }
}

/// 订阅消息事件流 / Stream message events 的查询参数和请求头。 / Query values and headers for `stream_chat_events`.
#[derive(Clone, Debug, Default)]
pub struct StreamChatEventsOptions {
    /// 可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.
    pub request_id: Option<String>,
}

/// 探测 SSE 连接 / Probe the SSE connection 的查询参数和请求头。 / Query values and headers for `probe_event_stream`.
#[derive(Clone, Debug, Default)]
pub struct ProbeEventStreamOptions {
    /// 可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.
    pub request_id: Option<String>,
}

/// 压缩会话上下文 / Compact conversation context 的查询参数和请求头。 / Query values and headers for `compact_conversation`.
#[derive(Clone, Debug, Default)]
pub struct CompactConversationOptions {
    /// 是否忽略当前阈值并强制压缩。 / Whether to compact regardless of the current threshold.
    pub force: Option<bool>,
}

/// 分页查询会话 / List conversations 的查询参数和请求头。 / Query values and headers for `list_conversations`.
#[derive(Clone, Debug, Default)]
pub struct ListConversationsOptions {
    /// 从 0 开始的页码。 / Zero-based page index.
    pub current: Option<i32>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
    /// 状态过滤条件。 / Status filter.
    pub status: Option<String>,
    /// 标题或正文检索关键字。 / Title or content search keyword.
    pub keyword: Option<String>,
    /// 字段 groupFilter / group filter field。
    pub group_filter: Option<String>,
    /// groupFilter 为 GROUP 时必填。 / Required when groupFilter is GROUP.
    pub group_id: Option<i64>,
}

/// 分页读取 SQL 结果 / Get paged SQL results 的查询参数和请求头。 / Query values and headers for `get_sql_query_result`.
#[derive(Clone, Debug, Default)]
pub struct GetSqlQueryResultOptions {
    /// 从 0 开始的页码。 / Zero-based page index.
    pub current: Option<i32>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
}

/// 导出 SQL 结果 / Export SQL results 的查询参数和请求头。 / Query values and headers for `export_sql_query_result`.
#[derive(Clone, Debug)]
pub struct ExportSqlQueryResultOptions {
    /// 导出格式。 / Export format.
    pub format: SqlExportFormat,
    /// 期望的导出媒体类型。 / Requested export media type.
    pub accept: Option<String>,
}

/// 分页查询会话消息 / List conversation messages 的查询参数和请求头。 / Query values and headers for `list_conversation_messages`.
#[derive(Clone, Debug, Default)]
pub struct ListConversationMessagesOptions {
    /// 从 0 开始的页码。 / Zero-based page index.
    pub current: Option<i32>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
    /// 排序字段列表。 / Ordered list of sort fields.
    pub order_by: Option<Vec<String>>,
    /// 排序方向。 / Sort direction.
    pub order_direction: Option<SortDirection>,
    /// 空值排序策略。 / Null ordering strategy.
    pub order_null_handling: Option<NullOrdering>,
    /// 标题或正文检索关键字。 / Title or content search keyword.
    pub keyword: Option<String>,
}

/// 分页查询异步任务 / List asynchronous tasks 的查询参数和请求头。 / Query values and headers for `list_conversation_async_tasks`.
#[derive(Clone, Debug, Default)]
pub struct ListConversationAsyncTasksOptions {
    /// 从 0 开始的页码。 / Zero-based page index.
    pub current: Option<i32>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
    /// 排序字段列表。 / Ordered list of sort fields.
    pub order_by: Option<Vec<String>>,
    /// 排序方向。 / Sort direction.
    pub order_direction: Option<SortDirection>,
    /// 空值排序策略。 / Null ordering strategy.
    pub order_null_handling: Option<NullOrdering>,
    /// 标题或正文检索关键字。 / Title or content search keyword.
    pub keyword: Option<String>,
    /// 状态过滤条件。 / Status filter.
    pub status: Option<Vec<String>>,
}

/// 增量同步异步任务 / Sync asynchronous task updates 的查询参数和请求头。 / Query values and headers for `sync_conversation_async_tasks`.
#[derive(Clone, Debug, Default)]
pub struct SyncConversationAsyncTasksOptions {
    /// 通知消息同步游标。 / Notification-message sync cursor.
    pub after_message_id: Option<String>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
}

/// 分页查询子 Agent 任务 / List subagent tasks 的查询参数和请求头。 / Query values and headers for `list_conversation_subagents`.
#[derive(Clone, Debug, Default)]
pub struct ListConversationSubagentsOptions {
    /// 从 0 开始的页码。 / Zero-based page index.
    pub current: Option<i32>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
    /// 排序字段列表。 / Ordered list of sort fields.
    pub order_by: Option<Vec<String>>,
    /// 排序方向。 / Sort direction.
    pub order_direction: Option<SortDirection>,
    /// 空值排序策略。 / Null ordering strategy.
    pub order_null_handling: Option<NullOrdering>,
    /// 标题或正文检索关键字。 / Title or content search keyword.
    pub keyword: Option<String>,
    /// 状态过滤条件。 / Status filter.
    pub status: Option<Vec<String>>,
}

/// 增量同步子 Agent 状态 / Sync subagent task updates 的查询参数和请求头。 / Query values and headers for `sync_conversation_subagents`.
#[derive(Clone, Debug, Default)]
pub struct SyncConversationSubagentsOptions {
    /// 子 Agent 状态同步游标。 / Subagent-state sync cursor.
    pub cursor: Option<String>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
}

/// 读取消息事件 / Get message events 的查询参数和请求头。 / Query values and headers for `get_chat_events`.
#[derive(Clone, Debug)]
pub struct GetChatEventsOptions {
    /// 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub conversation_id: String,
    /// 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
    pub message_id: String,
}

/// 查询用户问答状态 / Get user-input status 的查询参数和请求头。 / Query values and headers for `get_user_input_status`.
#[derive(Clone, Debug)]
pub struct GetUserInputStatusOptions {
    /// 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub conversation_id: String,
    /// 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
    pub message_id: String,
}

/// 检查 MD5 文件是否存在 / Check file existence by MD5 的查询参数和请求头。 / Query values and headers for `file_exists_by_content_md5`.
#[derive(Clone, Debug)]
pub struct FileExistsByContentMd5Options {
    /// 文件内容 MD5。 / MD5 digest of the file content.
    pub content_md5: String,
}

/// 分页查询工作区制品 / List workspace artifacts 的查询参数和请求头。 / Query values and headers for `list_workspace_artifacts`.
#[derive(Clone, Debug, Default)]
pub struct ListWorkspaceArtifactsOptions {
    /// 从 0 开始的页码。 / Zero-based page index.
    pub current: Option<i32>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
    /// 排序字段列表。 / Ordered list of sort fields.
    pub order_by: Option<Vec<String>>,
    /// 排序方向。 / Sort direction.
    pub order_direction: Option<SortDirection>,
    /// 空值排序策略。 / Null ordering strategy.
    pub order_null_handling: Option<NullOrdering>,
    /// 标题或正文检索关键字。 / Title or content search keyword.
    pub keyword: Option<String>,
    /// 工作区相对路径前缀。 / Workspace-relative path prefix.
    pub prefix: Option<String>,
}

/// 创建工作区文件预览地址 / Create a workspace file preview URL 的查询参数和请求头。 / Query values and headers for `get_workspace_file_preview`.
#[derive(Clone, Debug)]
pub struct GetWorkspaceFilePreviewOptions {
    /// 工作区相对文件路径。 / Workspace-relative file path.
    pub path: String,
}

/// 增量同步消息 / Sync conversation messages 的查询参数和请求头。 / Query values and headers for `sync_conversation_messages`.
#[derive(Clone, Debug, Default)]
pub struct SyncConversationMessagesOptions {
    /// 通知消息同步游标。 / Notification-message sync cursor.
    pub after_message_id: Option<String>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
}

/// 查询目标历史 / Get goal history 的查询参数和请求头。 / Query values and headers for `get_goal_history`.
#[derive(Clone, Debug, Default)]
pub struct GetGoalHistoryOptions {
    /// 分页信息 / page metadata。
    pub page: Option<i32>,
    /// 单页记录数。 / Number of records per page.
    pub size: Option<i32>,
}

/// configuration 分组的 channel 绑定接口。 / Channel-bound configuration operations.
pub struct ConfigurationApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> ConfigurationApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 读取 Agent 配置 / Get Agent configuration
    ///
    pub async fn get_agents_config(&self) -> Result<models::AgentsConfig, ApiError> {
        let suffix = "/config".to_owned();
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 读取会话配置 / Get conversation configuration
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub async fn get_conversation_config(
        &self,
        conversation_id: &str,
    ) -> Result<models::ConversationConfig, ApiError> {
        let suffix = format!(
            "/conversations/{}/config",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 签发短期渠道令牌 / Create a short-lived channel token
    ///
    pub async fn create_open_api_token(&self) -> Result<models::OpenApiToken, ApiError> {
        let suffix = "/presign".to_owned();
        self.client
            .request_model_internal(Method::POST, &suffix, None, &[])
            .await
    }
}

/// chat 分组的 channel 绑定接口。 / Channel-bound chat operations.
pub struct ChatApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> ChatApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 创建会话并提交消息 / Create a conversation and submit a message
    ///
    /// * `input` - 创建会话并提交消息 / Create a conversation and submit a message 的强类型请求体。 / Typed request body for `create_chat`.
    pub async fn create_chat(
        &self,
        input: &models::AiChatInput,
    ) -> Result<models::AiChatSubmission, ApiError> {
        let suffix = "".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 向已有会话提交消息 / Submit a message to an existing conversation
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 向已有会话提交消息 / Submit a message to an existing conversation 的强类型请求体。 / Typed request body for `continue_chat`.
    pub async fn continue_chat(
        &self,
        conversation_id: &str,
        input: &models::AiChatInput,
    ) -> Result<models::AiChatSubmission, ApiError> {
        let suffix = format!("/conversations/{}", encode_path_segment(conversation_id));
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 订阅消息事件流 / Stream message events
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `request_id` - 可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.
    /// * `input` - 订阅消息事件流 / Stream message events 的强类型请求体。 / Typed request body for `stream_chat_events`.
    pub async fn stream_chat_events(
        &self,
        conversation_id: &str,
        input: &models::AiChatStreamInput,
        options: &StreamChatEventsOptions,
    ) -> Result<AiChatEventStream, ApiError> {
        self.client
            .stream_chat_events_internal(conversation_id, input, options.request_id.as_deref())
            .await
    }

    /// 探测 SSE 连接 / Probe the SSE connection
    ///
    /// * `request_id` - 可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.
    /// * `input` - 探测 SSE 连接 / Probe the SSE connection 的强类型请求体。 / Typed request body for `probe_event_stream`.
    pub async fn probe_event_stream(
        &self,
        input: &models::ChatStreamProbeInput,
        options: &ProbeEventStreamOptions,
    ) -> Result<ProbeEventStream, ApiError> {
        self.client
            .probe_event_stream_internal(input, options.request_id.as_deref())
            .await
    }

    /// 中断会话执行 / Interrupt conversation execution
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub async fn interrupt_conversation(&self, conversation_id: &str) -> Result<(), ApiError> {
        let suffix = format!(
            "/conversations/{}/interrupt",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_status_internal(Method::DELETE, &suffix, None, &[])
            .await
    }

    /// 压缩会话上下文 / Compact conversation context
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `force` - 是否忽略当前阈值并强制压缩。 / Whether to compact regardless of the current threshold.
    pub async fn compact_conversation(
        &self,
        conversation_id: &str,
        options: &CompactConversationOptions,
    ) -> Result<(), ApiError> {
        let suffix = format!(
            "/conversations/{}/compact",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.force {
            query.push(QueryParameter::new("force", value.to_string()));
        }
        self.client
            .request_status_internal(Method::POST, &suffix, None, &query)
            .await
    }

    /// 读取当前目标 / Get current goal
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub async fn get_goal(&self, conversation_id: &str) -> Result<models::AgentGoalView, ApiError> {
        let suffix = format!(
            "/conversations/{}/goal",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 编辑目标 / Edit goal
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 编辑目标 / Edit goal 的强类型请求体。 / Typed request body for `edit_goal`.
    pub async fn edit_goal(
        &self,
        conversation_id: &str,
        input: &models::EditAgentGoalInput,
    ) -> Result<models::AgentGoal, ApiError> {
        let suffix = format!(
            "/conversations/{}/goal",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(
                Method::PATCH,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 查询目标历史 / Get goal history
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `page` - 分页信息 / page metadata。
    /// * `size` - 单页记录数。 / Number of records per page.
    pub async fn get_goal_history(
        &self,
        conversation_id: &str,
        options: &GetGoalHistoryOptions,
    ) -> Result<models::AgentGoalHistory, ApiError> {
        let suffix = format!(
            "/conversations/{}/goal/history",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.page {
            query.push(QueryParameter::new("page", value.to_string()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 暂停目标 / Pause goal
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 暂停目标 / Pause goal 的强类型请求体。 / Typed request body for `pause_goal`.
    pub async fn pause_goal(
        &self,
        conversation_id: &str,
        input: &models::AgentGoalRefInput,
    ) -> Result<models::AgentGoal, ApiError> {
        let suffix = format!(
            "/conversations/{}/goal/pause",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 恢复目标 / Resume goal
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 恢复目标 / Resume goal 的强类型请求体。 / Typed request body for `resume_goal`.
    pub async fn resume_goal(
        &self,
        conversation_id: &str,
        input: &models::AgentGoalRefInput,
    ) -> Result<models::AgentGoal, ApiError> {
        let suffix = format!(
            "/conversations/{}/goal/resume",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 清除目标 / Clear goal
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 清除目标 / Clear goal 的强类型请求体。 / Typed request body for `clear_goal`.
    pub async fn clear_goal(
        &self,
        conversation_id: &str,
        input: &models::AgentGoalRefInput,
    ) -> Result<models::AgentGoal, ApiError> {
        let suffix = format!(
            "/conversations/{}/goal/clear",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }
}

/// conversations 分组的 channel 绑定接口。 / Channel-bound conversations operations.
pub struct ConversationsApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> ConversationsApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 删除会话 / Delete a conversation
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub async fn delete_conversation(&self, conversation_id: &str) -> Result<(), ApiError> {
        let suffix = format!("/conversations/{}", encode_path_segment(conversation_id));
        self.client
            .request_status_internal(Method::DELETE, &suffix, None, &[])
            .await
    }

    /// 读取会话摘要 / Get conversation summary
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub async fn get_conversation_summary(
        &self,
        conversation_id: &str,
    ) -> Result<models::ConversationSummary, ApiError> {
        let suffix = format!("/conversations/{}", encode_path_segment(conversation_id));
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 读取上下文占用 / Get context usage
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub async fn get_conversation_context_usage(
        &self,
        conversation_id: &str,
    ) -> Result<models::ConversationContextUsage, ApiError> {
        let suffix = format!(
            "/conversations/{}/context-usage",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 分页查询会话 / List conversations
    ///
    /// * `current` - 从 0 开始的页码。 / Zero-based page index.
    /// * `size` - 单页记录数。 / Number of records per page.
    /// * `status` - 状态过滤条件。 / Status filter.
    /// * `keyword` - 标题或正文检索关键字。 / Title or content search keyword.
    /// * `group_filter` - 字段 groupFilter / group filter field。
    /// * `group_id` - groupFilter 为 GROUP 时必填。 / Required when groupFilter is GROUP.
    pub async fn list_conversations(
        &self,
        options: &ListConversationsOptions,
    ) -> Result<models::ConversationSummaryList, ApiError> {
        let suffix = "/conversations".to_owned();
        let mut query = Vec::new();
        if let Some(value) = &options.current {
            query.push(QueryParameter::new("current", value.to_string()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        if let Some(value) = &options.status {
            query.push(QueryParameter::new("status", value.as_str()));
        }
        if let Some(value) = &options.keyword {
            query.push(QueryParameter::new("keyword", value.as_str()));
        }
        if let Some(value) = &options.group_filter {
            query.push(QueryParameter::new("groupFilter", value.as_str()));
        }
        if let Some(value) = &options.group_id {
            query.push(QueryParameter::new("groupId", value.to_string()));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 查询活动会话 / List active conversations
    ///
    pub async fn list_active_conversations(&self) -> Result<models::ConversationIds, ApiError> {
        let suffix = "/conversations/active".to_owned();
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 查询未读会话 / List unread conversations
    ///
    pub async fn list_unread_conversations(&self) -> Result<models::ConversationIds, ApiError> {
        let suffix = "/conversations/unread".to_owned();
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 批量查询会话活动 / Query conversation activities
    ///
    /// * `input` - 批量查询会话活动 / Query conversation activities 的强类型请求体。 / Typed request body for `query_conversation_activities`.
    pub async fn query_conversation_activities(
        &self,
        input: &models::ConversationActivityBatchInput,
    ) -> Result<models::ConversationActivityList, ApiError> {
        let suffix = "/conversations/activity/query".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 推进会话已读游标 / Mark a conversation as read
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 推进会话已读游标 / Mark a conversation as read 的强类型请求体。 / Typed request body for `mark_conversation_read`.
    pub async fn mark_conversation_read(
        &self,
        conversation_id: &str,
        input: &models::ConversationReadReceiptInput,
    ) -> Result<models::ConversationReadReceipt, ApiError> {
        let suffix = format!(
            "/conversations/{}/read-receipt",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(
                Method::PUT,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 读取会话统计 / Get conversation statistics
    ///
    pub async fn get_conversation_stats(&self) -> Result<models::ConversationStats, ApiError> {
        let suffix = "/conversations/stats".to_owned();
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 读取会话标题 / Get conversation title
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    pub async fn get_conversation_title(
        &self,
        conversation_id: &str,
    ) -> Result<models::ConversationTitle, ApiError> {
        let suffix = format!(
            "/conversations/{}/title",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 更新会话标题 / Update conversation title
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 更新会话标题 / Update conversation title 的强类型请求体。 / Typed request body for `update_conversation_title`.
    pub async fn update_conversation_title(
        &self,
        conversation_id: &str,
        input: &models::ConversationTitleInput,
    ) -> Result<models::ConversationMetadata, ApiError> {
        let suffix = format!(
            "/conversations/{}/title",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(
                Method::PATCH,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 更新会话状态 / Update conversation status
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 更新会话状态 / Update conversation status 的强类型请求体。 / Typed request body for `update_conversation_status`.
    pub async fn update_conversation_status(
        &self,
        conversation_id: &str,
        input: &models::ConversationStatusInput,
    ) -> Result<(), ApiError> {
        let suffix = format!(
            "/conversations/{}/status",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_status_internal(
                Method::PATCH,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 查询会话分组 / List conversation groups
    ///
    pub async fn list_conversation_groups(
        &self,
    ) -> Result<models::ConversationGroupList, ApiError> {
        let suffix = "/conversation-groups".to_owned();
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 创建会话分组 / Create conversation group
    ///
    /// * `input` - 创建会话分组 / Create conversation group 的强类型请求体。 / Typed request body for `create_conversation_group`.
    pub async fn create_conversation_group(
        &self,
        input: &models::ConversationGroupNameInput,
    ) -> Result<models::ConversationGroup, ApiError> {
        let suffix = "/conversation-groups".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 重命名会话分组 / Rename conversation group
    ///
    /// * `group_id` - 字段 groupId / group id field。
    /// * `input` - 重命名会话分组 / Rename conversation group 的强类型请求体。 / Typed request body for `rename_conversation_group`.
    pub async fn rename_conversation_group(
        &self,
        group_id: i64,
        input: &models::ConversationGroupNameInput,
    ) -> Result<models::ConversationGroup, ApiError> {
        let suffix = format!("/conversation-groups/{}", encode_path_segment(group_id));
        self.client
            .request_model_internal(
                Method::PATCH,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 删除会话分组 / Delete conversation group
    ///
    /// * `group_id` - 字段 groupId / group id field。
    pub async fn delete_conversation_group(
        &self,
        group_id: i64,
    ) -> Result<models::ConversationGroupDeleted, ApiError> {
        let suffix = format!("/conversation-groups/{}", encode_path_segment(group_id));
        self.client
            .request_model_internal(Method::DELETE, &suffix, None, &[])
            .await
    }

    /// 移动会话分组 / Move conversation to group
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `input` - 移动会话分组 / Move conversation to group 的强类型请求体。 / Typed request body for `move_conversation_to_group`.
    pub async fn move_conversation_to_group(
        &self,
        conversation_id: &str,
        input: &models::UpdateConversationGroupInput,
    ) -> Result<models::ConversationMetadata, ApiError> {
        let suffix = format!(
            "/conversations/{}/group",
            encode_path_segment(conversation_id)
        );
        self.client
            .request_model_internal(
                Method::PATCH,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }
}

/// sql 分组的 channel 绑定接口。 / Channel-bound sql operations.
pub struct SqlApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> SqlApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 分页读取 SQL 结果 / Get paged SQL results
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `result_id` - SQL 查询结果 ID。 / SQL query-result ID.
    /// * `current` - 从 0 开始的页码。 / Zero-based page index.
    /// * `size` - 单页记录数。 / Number of records per page.
    pub async fn get_sql_query_result(
        &self,
        conversation_id: &str,
        result_id: &str,
        options: &GetSqlQueryResultOptions,
    ) -> Result<models::SqlQueryResultPage, ApiError> {
        let suffix = format!(
            "/conversations/{}/sql-query-results/{}",
            encode_path_segment(conversation_id),
            encode_path_segment(result_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.current {
            query.push(QueryParameter::new("current", value.to_string()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 读取 SQL 图表数据 / Get SQL chart data
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `result_id` - SQL 查询结果 ID。 / SQL query-result ID.
    pub async fn get_sql_query_chart_data(
        &self,
        conversation_id: &str,
        result_id: &str,
    ) -> Result<models::SqlChartDataset, ApiError> {
        let suffix = format!(
            "/conversations/{}/sql-query-results/{}/chart-data",
            encode_path_segment(conversation_id),
            encode_path_segment(result_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 导出 SQL 结果 / Export SQL results
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `result_id` - SQL 查询结果 ID。 / SQL query-result ID.
    /// * `format` - 导出格式。 / Export format.
    /// * `accept` - 期望的导出媒体类型。 / Requested export media type.
    pub async fn export_sql_query_result(
        &self,
        conversation_id: &str,
        result_id: &str,
        options: &ExportSqlQueryResultOptions,
    ) -> Result<Vec<u8>, ApiError> {
        let suffix = format!(
            "/conversations/{}/sql-query-results/{}/export",
            encode_path_segment(conversation_id),
            encode_path_segment(result_id)
        );
        let mut query = Vec::new();
        query.push(QueryParameter::new("format", options.format.as_str()));
        self.client
            .request_bytes_internal(
                &suffix,
                &query,
                options
                    .accept
                    .as_deref()
                    .unwrap_or("application/octet-stream"),
            )
            .await
    }
}

/// messages 分组的 channel 绑定接口。 / Channel-bound messages operations.
pub struct MessagesApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> MessagesApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 分页查询会话消息 / List conversation messages
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `current` - 从 0 开始的页码。 / Zero-based page index.
    /// * `size` - 单页记录数。 / Number of records per page.
    /// * `order_by` - 排序字段列表。 / Ordered list of sort fields.
    /// * `order_direction` - 排序方向。 / Sort direction.
    /// * `order_null_handling` - 空值排序策略。 / Null ordering strategy.
    /// * `keyword` - 标题或正文检索关键字。 / Title or content search keyword.
    pub async fn list_conversation_messages(
        &self,
        conversation_id: &str,
        options: &ListConversationMessagesOptions,
    ) -> Result<models::ConversationMessagePage, ApiError> {
        let suffix = format!(
            "/conversations/{}/messages",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.current {
            query.push(QueryParameter::new("current", value.to_string()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        for value in options.order_by.as_deref().unwrap_or(&[]) {
            query.push(QueryParameter::new("orderBy", value));
        }
        if let Some(value) = &options.order_direction {
            query.push(QueryParameter::new("orderDirection", value.as_str()));
        }
        if let Some(value) = &options.order_null_handling {
            query.push(QueryParameter::new("orderNullHandling", value.as_str()));
        }
        if let Some(value) = &options.keyword {
            query.push(QueryParameter::new("keyword", value.as_str()));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 读取单条会话消息 / Get a conversation message
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `message_id` - 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
    pub async fn get_conversation_message(
        &self,
        conversation_id: &str,
        message_id: &str,
    ) -> Result<models::ConversationMessage, ApiError> {
        let suffix = format!(
            "/conversations/{}/messages/{}",
            encode_path_segment(conversation_id),
            encode_path_segment(message_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 分页查询异步任务 / List asynchronous tasks
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `current` - 从 0 开始的页码。 / Zero-based page index.
    /// * `size` - 单页记录数。 / Number of records per page.
    /// * `order_by` - 排序字段列表。 / Ordered list of sort fields.
    /// * `order_direction` - 排序方向。 / Sort direction.
    /// * `order_null_handling` - 空值排序策略。 / Null ordering strategy.
    /// * `keyword` - 标题或正文检索关键字。 / Title or content search keyword.
    /// * `status` - 状态过滤条件。 / Status filter.
    pub async fn list_conversation_async_tasks(
        &self,
        conversation_id: &str,
        options: &ListConversationAsyncTasksOptions,
    ) -> Result<models::AsyncTaskPage, ApiError> {
        let suffix = format!(
            "/conversations/{}/async-tasks",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.current {
            query.push(QueryParameter::new("current", value.to_string()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        for value in options.order_by.as_deref().unwrap_or(&[]) {
            query.push(QueryParameter::new("orderBy", value));
        }
        if let Some(value) = &options.order_direction {
            query.push(QueryParameter::new("orderDirection", value.as_str()));
        }
        if let Some(value) = &options.order_null_handling {
            query.push(QueryParameter::new("orderNullHandling", value.as_str()));
        }
        if let Some(value) = &options.keyword {
            query.push(QueryParameter::new("keyword", value.as_str()));
        }
        for value in options.status.as_deref().unwrap_or(&[]) {
            query.push(QueryParameter::new("status", value));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 增量同步异步任务 / Sync asynchronous task updates
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `after_message_id` - 通知消息同步游标。 / Notification-message sync cursor.
    /// * `size` - 单页记录数。 / Number of records per page.
    pub async fn sync_conversation_async_tasks(
        &self,
        conversation_id: &str,
        options: &SyncConversationAsyncTasksOptions,
    ) -> Result<models::AgentAsyncTaskSync, ApiError> {
        let suffix = format!(
            "/conversations/{}/async-tasks/sync",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.after_message_id {
            query.push(QueryParameter::new("afterMessageId", value.as_str()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 读取异步任务 / Get an asynchronous task
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `async_task_id` - 异步任务 ID。 / Asynchronous task ID.
    pub async fn get_conversation_async_task(
        &self,
        conversation_id: &str,
        async_task_id: &str,
    ) -> Result<models::AsyncTask, ApiError> {
        let suffix = format!(
            "/conversations/{}/async-tasks/{}",
            encode_path_segment(conversation_id),
            encode_path_segment(async_task_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 分页查询子 Agent 任务 / List subagent tasks
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `current` - 从 0 开始的页码。 / Zero-based page index.
    /// * `size` - 单页记录数。 / Number of records per page.
    /// * `order_by` - 排序字段列表。 / Ordered list of sort fields.
    /// * `order_direction` - 排序方向。 / Sort direction.
    /// * `order_null_handling` - 空值排序策略。 / Null ordering strategy.
    /// * `keyword` - 标题或正文检索关键字。 / Title or content search keyword.
    /// * `status` - 状态过滤条件。 / Status filter.
    pub async fn list_conversation_subagents(
        &self,
        conversation_id: &str,
        options: &ListConversationSubagentsOptions,
    ) -> Result<models::SubagentTaskPage, ApiError> {
        let suffix = format!(
            "/conversations/{}/subagents",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.current {
            query.push(QueryParameter::new("current", value.to_string()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        for value in options.order_by.as_deref().unwrap_or(&[]) {
            query.push(QueryParameter::new("orderBy", value));
        }
        if let Some(value) = &options.order_direction {
            query.push(QueryParameter::new("orderDirection", value.as_str()));
        }
        if let Some(value) = &options.order_null_handling {
            query.push(QueryParameter::new("orderNullHandling", value.as_str()));
        }
        if let Some(value) = &options.keyword {
            query.push(QueryParameter::new("keyword", value.as_str()));
        }
        for value in options.status.as_deref().unwrap_or(&[]) {
            query.push(QueryParameter::new("status", value));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 增量同步子 Agent 状态 / Sync subagent task updates
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `cursor` - 子 Agent 状态同步游标。 / Subagent-state sync cursor.
    /// * `size` - 单页记录数。 / Number of records per page.
    pub async fn sync_conversation_subagents(
        &self,
        conversation_id: &str,
        options: &SyncConversationSubagentsOptions,
    ) -> Result<models::SubagentTaskSync, ApiError> {
        let suffix = format!(
            "/conversations/{}/subagents/sync",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.cursor {
            query.push(QueryParameter::new("cursor", value.as_str()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 读取子 Agent 状态 / Get a subagent task
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `subagent_task_id` - 子 Agent 任务 ID。 / Subagent task ID.
    pub async fn get_conversation_subagent(
        &self,
        conversation_id: &str,
        subagent_task_id: &str,
    ) -> Result<models::SubagentTask, ApiError> {
        let suffix = format!(
            "/conversations/{}/subagents/{}",
            encode_path_segment(conversation_id),
            encode_path_segment(subagent_task_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 取消子 Agent 任务 / Cancel a subagent task
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `subagent_task_id` - 子 Agent 任务 ID。 / Subagent task ID.
    pub async fn cancel_conversation_subagent(
        &self,
        conversation_id: &str,
        subagent_task_id: &str,
    ) -> Result<models::SubagentTask, ApiError> {
        let suffix = format!(
            "/conversations/{}/subagents/{}",
            encode_path_segment(conversation_id),
            encode_path_segment(subagent_task_id)
        );
        self.client
            .request_model_internal(Method::DELETE, &suffix, None, &[])
            .await
    }

    /// 读取子 Agent 结果 / Get a subagent result
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `subagent_task_id` - 子 Agent 任务 ID。 / Subagent task ID.
    pub async fn get_conversation_subagent_result(
        &self,
        conversation_id: &str,
        subagent_task_id: &str,
    ) -> Result<models::SubagentTaskResult, ApiError> {
        let suffix = format!(
            "/conversations/{}/subagents/{}/result",
            encode_path_segment(conversation_id),
            encode_path_segment(subagent_task_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 取消排队消息 / Cancel a queued message
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `message_id` - 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
    pub async fn cancel_queued_message(
        &self,
        conversation_id: &str,
        message_id: &str,
    ) -> Result<models::ConversationMessage, ApiError> {
        let suffix = format!(
            "/conversations/{}/messages/{}/queue",
            encode_path_segment(conversation_id),
            encode_path_segment(message_id)
        );
        self.client
            .request_model_internal(Method::DELETE, &suffix, None, &[])
            .await
    }

    /// 增量同步消息 / Sync conversation messages
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `after_message_id` - 通知消息同步游标。 / Notification-message sync cursor.
    /// * `size` - 单页记录数。 / Number of records per page.
    pub async fn sync_conversation_messages(
        &self,
        conversation_id: &str,
        options: &SyncConversationMessagesOptions,
    ) -> Result<models::ConversationMessageSync, ApiError> {
        let suffix = format!(
            "/conversations/{}/messages/sync",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.after_message_id {
            query.push(QueryParameter::new("afterMessageId", value.as_str()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }
}

/// events 分组的 channel 绑定接口。 / Channel-bound events operations.
pub struct EventsApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> EventsApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 读取消息事件 / Get message events
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `message_id` - 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
    pub async fn get_chat_events(
        &self,
        options: &GetChatEventsOptions,
    ) -> Result<models::AiChatBriefEventList, ApiError> {
        let suffix = "/events".to_owned();
        let mut query = Vec::new();
        query.push(QueryParameter::new(
            "conversationId",
            options.conversation_id.to_string(),
        ));
        query.push(QueryParameter::new(
            "messageId",
            options.message_id.to_string(),
        ));
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 批量读取消息事件 / Get message events in batch
    ///
    /// * `input` - 批量读取消息事件 / Get message events in batch 的强类型请求体。 / Typed request body for `get_chat_events_batch`.
    pub async fn get_chat_events_batch(
        &self,
        input: &models::AiChatEventsBatchInput,
    ) -> Result<models::AiChatEventsBatch, ApiError> {
        let suffix = "/events/batch".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }
}

/// interactions 分组的 channel 绑定接口。 / Channel-bound interactions operations.
pub struct InteractionsApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> InteractionsApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 提交计划审批 / Submit plan approval
    ///
    /// * `input` - 提交计划审批 / Submit plan approval 的强类型请求体。 / Typed request body for `approve_plan`.
    pub async fn approve_plan(
        &self,
        input: &models::PlanApprovalInput,
    ) -> Result<models::OperationResult, ApiError> {
        let suffix = "/plan/approve".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 查询计划审批状态 / Get plan approval status
    ///
    /// * `plan_id` - 等待审批的计划 ID。 / Pending plan-approval ID.
    pub async fn get_plan_status(&self, plan_id: &str) -> Result<models::PlanStatus, ApiError> {
        let suffix = format!("/plan/{}/status", encode_path_segment(plan_id));
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 查询用户问答状态 / Get user-input status
    ///
    /// * `question_id` - 等待回答的问题 ID。 / Pending question ID.
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `message_id` - 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
    pub async fn get_user_input_status(
        &self,
        question_id: &str,
        options: &GetUserInputStatusOptions,
    ) -> Result<models::UserInputStatus, ApiError> {
        let suffix = format!("/user-input/{}/status", encode_path_segment(question_id));
        let mut query = Vec::new();
        query.push(QueryParameter::new(
            "conversationId",
            options.conversation_id.to_string(),
        ));
        query.push(QueryParameter::new(
            "messageId",
            options.message_id.to_string(),
        ));
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 提交用户回答 / Submit a user answer
    ///
    /// * `input` - 提交用户回答 / Submit a user answer 的强类型请求体。 / Typed request body for `answer_user_input`.
    pub async fn answer_user_input(
        &self,
        input: &models::UserInputAnswerInput,
    ) -> Result<models::OperationResult, ApiError> {
        let suffix = "/user-input/answer".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 查询消息计划审批状态 / Get message plan status
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `message_id` - 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
    pub async fn get_message_plan_status(
        &self,
        conversation_id: &str,
        message_id: &str,
    ) -> Result<models::PlanStatus, ApiError> {
        let suffix = format!(
            "/conversations/{}/messages/{}/plan/status",
            encode_path_segment(conversation_id),
            encode_path_segment(message_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }
}

/// files 分组的 channel 绑定接口。 / Channel-bound files operations.
pub struct FilesApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> FilesApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 创建预签名上传地址 / Create a presigned upload URL
    ///
    /// * `input` - 创建预签名上传地址 / Create a presigned upload URL 的强类型请求体。 / Typed request body for `create_pre_signed_upload`.
    pub async fn create_pre_signed_upload(
        &self,
        input: &models::GeneratePreSignedUrlInput,
    ) -> Result<models::GeneratePreSignedUrlOutput, ApiError> {
        let suffix = "/files/pre-signed-url/write".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 确认预签名上传 / Confirm a presigned upload
    ///
    /// * `input` - 确认预签名上传 / Confirm a presigned upload 的强类型请求体。 / Typed request body for `confirm_pre_signed_upload`.
    pub async fn confirm_pre_signed_upload(
        &self,
        input: &models::ConfirmUploadInput,
    ) -> Result<models::AgentFile, ApiError> {
        let suffix = "/files/pre-signed-url/confirm".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 按 MD5 复用文件 / Reuse a file by MD5
    ///
    /// * `input` - 按 MD5 复用文件 / Reuse a file by MD5 的强类型请求体。 / Typed request body for `create_file_by_content_md5`.
    pub async fn create_file_by_content_md5(
        &self,
        input: &models::CreateFileInput,
    ) -> Result<models::AgentFile, ApiError> {
        let suffix = "/files/contentMd5".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 检查 MD5 文件是否存在 / Check file existence by MD5
    ///
    /// * `content_md5` - 文件内容 MD5。 / MD5 digest of the file content.
    pub async fn file_exists_by_content_md5(
        &self,
        options: &FileExistsByContentMd5Options,
    ) -> Result<models::FileExists, ApiError> {
        let suffix = "/files/meta/contentMd5".to_owned();
        let mut query = Vec::new();
        query.push(QueryParameter::new(
            "contentMd5",
            options.content_md5.to_string(),
        ));
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 创建会话文件预览地址 / Create a conversation file preview URL
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `file_id` - 文件记录 ID。 / File record ID.
    pub async fn get_conversation_file_preview(
        &self,
        conversation_id: &str,
        file_id: i64,
    ) -> Result<models::PreSignedReadUrl, ApiError> {
        let suffix = format!(
            "/conversations/{}/files/{}/preview",
            encode_path_segment(conversation_id),
            encode_path_segment(file_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }

    /// 创建计划快照预览地址 / Create a plan snapshot preview URL
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `message_id` - 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
    /// * `file_id` - 文件记录 ID。 / File record ID.
    pub async fn get_plan_intermediate_file_preview(
        &self,
        conversation_id: &str,
        message_id: &str,
        file_id: i64,
    ) -> Result<models::PreSignedReadUrl, ApiError> {
        let suffix = format!(
            "/conversations/{}/messages/{}/plan-intermediate-files/{}/preview",
            encode_path_segment(conversation_id),
            encode_path_segment(message_id),
            encode_path_segment(file_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }
}

/// knowledge 分组的 channel 绑定接口。 / Channel-bound knowledge operations.
pub struct KnowledgeApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> KnowledgeApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 批量读取引用元数据 / Get citation metadata in batch
    ///
    /// * `input` - 批量读取引用元数据 / Get citation metadata in batch 的强类型请求体。 / Typed request body for `get_citation_metadata_batch`.
    pub async fn get_citation_metadata_batch(
        &self,
        input: &[models::ReturnedReference],
    ) -> Result<models::CitationMetadataList, ApiError> {
        let suffix = "/knowledge-bases/citations/metadata".to_owned();
        self.client
            .request_model_internal(
                Method::POST,
                &suffix,
                Some(serde_json::to_string(input)?),
                &[],
            )
            .await
    }

    /// 读取引用元数据 / Get citation metadata
    ///
    /// * `citation_type` - 知识引用类型。 / Knowledge citation type.
    /// * `reference_id` - 知识引用记录 ID。 / Knowledge-reference record ID.
    pub async fn get_citation_metadata(
        &self,
        citation_type: &str,
        reference_id: i64,
    ) -> Result<models::CitationMetadata, ApiError> {
        let suffix = format!(
            "/knowledge-bases/citations/{}/{}/metadata",
            encode_path_segment(citation_type),
            encode_path_segment(reference_id)
        );
        self.client
            .request_model_internal(Method::GET, &suffix, None, &[])
            .await
    }
}

/// workspace 分组的 channel 绑定接口。 / Channel-bound workspace operations.
pub struct WorkspaceApi<'a> {
    client: &'a AgentsUserClient,
}

impl<'a> WorkspaceApi<'a> {
    pub(crate) fn new(client: &'a AgentsUserClient) -> Self {
        Self { client }
    }

    /// 分页查询工作区制品 / List workspace artifacts
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `current` - 从 0 开始的页码。 / Zero-based page index.
    /// * `size` - 单页记录数。 / Number of records per page.
    /// * `order_by` - 排序字段列表。 / Ordered list of sort fields.
    /// * `order_direction` - 排序方向。 / Sort direction.
    /// * `order_null_handling` - 空值排序策略。 / Null ordering strategy.
    /// * `keyword` - 标题或正文检索关键字。 / Title or content search keyword.
    /// * `prefix` - 工作区相对路径前缀。 / Workspace-relative path prefix.
    pub async fn list_workspace_artifacts(
        &self,
        conversation_id: &str,
        options: &ListWorkspaceArtifactsOptions,
    ) -> Result<models::WorkspaceArtifactList, ApiError> {
        let suffix = format!(
            "/conversations/{}/workspace/files",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        if let Some(value) = &options.current {
            query.push(QueryParameter::new("current", value.to_string()));
        }
        if let Some(value) = &options.size {
            query.push(QueryParameter::new("size", value.to_string()));
        }
        for value in options.order_by.as_deref().unwrap_or(&[]) {
            query.push(QueryParameter::new("orderBy", value));
        }
        if let Some(value) = &options.order_direction {
            query.push(QueryParameter::new("orderDirection", value.as_str()));
        }
        if let Some(value) = &options.order_null_handling {
            query.push(QueryParameter::new("orderNullHandling", value.as_str()));
        }
        if let Some(value) = &options.keyword {
            query.push(QueryParameter::new("keyword", value.as_str()));
        }
        if let Some(value) = &options.prefix {
            query.push(QueryParameter::new("prefix", value.as_str()));
        }
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }

    /// 创建工作区文件预览地址 / Create a workspace file preview URL
    ///
    /// * `conversation_id` - 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
    /// * `path` - 工作区相对文件路径。 / Workspace-relative file path.
    pub async fn get_workspace_file_preview(
        &self,
        conversation_id: &str,
        options: &GetWorkspaceFilePreviewOptions,
    ) -> Result<models::PreSignedReadUrl, ApiError> {
        let suffix = format!(
            "/conversations/{}/workspace/files/preview",
            encode_path_segment(conversation_id)
        );
        let mut query = Vec::new();
        query.push(QueryParameter::new("path", options.path.to_string()));
        self.client
            .request_model_internal(Method::GET, &suffix, None, &query)
            .await
    }
}

fn encode_path_segment(value: impl ToString) -> String {
    url::form_urlencoded::byte_serialize(value.to_string().as_bytes()).collect()
}
