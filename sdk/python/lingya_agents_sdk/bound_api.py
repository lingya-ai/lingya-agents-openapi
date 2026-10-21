"""Channel-bound API groups generated from the Lingya Agents contract.

The wire contract keeps channelId in every path. These public methods omit it
because AgentsClient already binds the channel before a user is selected.
"""

from __future__ import annotations

from collections.abc import Iterator, Sequence
from typing import Literal
from urllib.parse import quote

from lingya_agents_sdk.events import AiChatBriefEvent
from lingya_agents_sdk.models.agent_async_task_sync import AgentAsyncTaskSync
from lingya_agents_sdk.models.agent_file import AgentFile
from lingya_agents_sdk.models.agent_goal import AgentGoal
from lingya_agents_sdk.models.agent_goal_history import AgentGoalHistory
from lingya_agents_sdk.models.agent_goal_ref_input import AgentGoalRefInput
from lingya_agents_sdk.models.agent_goal_view import AgentGoalView
from lingya_agents_sdk.models.agents_config import AgentsConfig
from lingya_agents_sdk.models.ai_chat_brief_event_list import AiChatBriefEventList
from lingya_agents_sdk.models.ai_chat_events_batch import AiChatEventsBatch
from lingya_agents_sdk.models.ai_chat_events_batch_input import AiChatEventsBatchInput
from lingya_agents_sdk.models.ai_chat_input import AiChatInput
from lingya_agents_sdk.models.ai_chat_stream_input import AiChatStreamInput
from lingya_agents_sdk.models.ai_chat_submission import AiChatSubmission
from lingya_agents_sdk.models.async_task import AsyncTask
from lingya_agents_sdk.models.async_task_page import AsyncTaskPage
from lingya_agents_sdk.models.chat_stream_probe_event import ChatStreamProbeEvent
from lingya_agents_sdk.models.chat_stream_probe_input import ChatStreamProbeInput
from lingya_agents_sdk.models.citation_metadata import CitationMetadata
from lingya_agents_sdk.models.citation_metadata_list import CitationMetadataList
from lingya_agents_sdk.models.confirm_upload_input import ConfirmUploadInput
from lingya_agents_sdk.models.conversation_activity_batch_input import ConversationActivityBatchInput
from lingya_agents_sdk.models.conversation_activity_list import ConversationActivityList
from lingya_agents_sdk.models.conversation_config import ConversationConfig
from lingya_agents_sdk.models.conversation_context_usage import ConversationContextUsage
from lingya_agents_sdk.models.conversation_group import ConversationGroup
from lingya_agents_sdk.models.conversation_group_deleted import ConversationGroupDeleted
from lingya_agents_sdk.models.conversation_group_list import ConversationGroupList
from lingya_agents_sdk.models.conversation_group_name_input import ConversationGroupNameInput
from lingya_agents_sdk.models.conversation_ids import ConversationIds
from lingya_agents_sdk.models.conversation_message import ConversationMessage
from lingya_agents_sdk.models.conversation_message_page import ConversationMessagePage
from lingya_agents_sdk.models.conversation_message_sync import ConversationMessageSync
from lingya_agents_sdk.models.conversation_metadata import ConversationMetadata
from lingya_agents_sdk.models.conversation_read_receipt import ConversationReadReceipt
from lingya_agents_sdk.models.conversation_read_receipt_input import ConversationReadReceiptInput
from lingya_agents_sdk.models.conversation_stats import ConversationStats
from lingya_agents_sdk.models.conversation_status_input import ConversationStatusInput
from lingya_agents_sdk.models.conversation_summary import ConversationSummary
from lingya_agents_sdk.models.conversation_summary_list import ConversationSummaryList
from lingya_agents_sdk.models.conversation_title import ConversationTitle
from lingya_agents_sdk.models.conversation_title_input import ConversationTitleInput
from lingya_agents_sdk.models.create_file_input import CreateFileInput
from lingya_agents_sdk.models.edit_agent_goal_input import EditAgentGoalInput
from lingya_agents_sdk.models.file_exists import FileExists
from lingya_agents_sdk.models.generate_pre_signed_url_input import GeneratePreSignedUrlInput
from lingya_agents_sdk.models.generate_pre_signed_url_output import GeneratePreSignedUrlOutput
from lingya_agents_sdk.models.open_api_token import OpenApiToken
from lingya_agents_sdk.models.operation_result import OperationResult
from lingya_agents_sdk.models.plan_approval_input import PlanApprovalInput
from lingya_agents_sdk.models.plan_status import PlanStatus
from lingya_agents_sdk.models.pre_signed_read_url import PreSignedReadUrl
from lingya_agents_sdk.models.returned_reference import ReturnedReference
from lingya_agents_sdk.models.sql_chart_dataset import SqlChartDataset
from lingya_agents_sdk.models.sql_query_result_page import SqlQueryResultPage
from lingya_agents_sdk.models.subagent_task import SubagentTask
from lingya_agents_sdk.models.subagent_task_page import SubagentTaskPage
from lingya_agents_sdk.models.subagent_task_result import SubagentTaskResult
from lingya_agents_sdk.models.subagent_task_sync import SubagentTaskSync
from lingya_agents_sdk.models.update_conversation_group_input import UpdateConversationGroupInput
from lingya_agents_sdk.models.user_input_answer_input import UserInputAnswerInput
from lingya_agents_sdk.models.user_input_status import UserInputStatus
from lingya_agents_sdk.models.workspace_artifact_list import WorkspaceArtifactList


class ConfigurationApi:
    """configuration 分组的 channel 绑定接口。 / Channel-bound configuration operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def get_agents_config(
        self,
    ) -> AgentsConfig:
        """读取 Agent 配置 / Get Agent configuration

        Args:

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/config"
        return self._client._request_model("GET", suffix, AgentsConfig, None, ())

    def get_conversation_config(
        self,
        conversation_id: str,
    ) -> ConversationConfig:
        """读取会话配置 / Get conversation configuration

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/config"
        return self._client._request_model("GET", suffix, ConversationConfig, None, ())

    def create_open_api_token(
        self,
    ) -> OpenApiToken:
        """签发短期渠道令牌 / Create a short-lived channel token

        Args:

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/presign"
        return self._client._request_model("POST", suffix, OpenApiToken, None, ())


class ChatApi:
    """chat 分组的 channel 绑定接口。 / Channel-bound chat operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def create_chat(
        self,
        input: AiChatInput,
    ) -> AiChatSubmission:
        """创建会话并提交消息 / Create a conversation and submit a message

        Args:
            input: 创建会话并提交消息 / Create a conversation and submit a message 的强类型请求体。 / Typed request body for createChat.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = ""
        return self._client._request_model("POST", suffix, AiChatSubmission, input, ())

    def continue_chat(
        self,
        conversation_id: str,
        input: AiChatInput,
    ) -> AiChatSubmission:
        """向已有会话提交消息 / Submit a message to an existing conversation

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 向已有会话提交消息 / Submit a message to an existing conversation 的强类型请求体。 / Typed request body for continueChat.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}"
        return self._client._request_model("POST", suffix, AiChatSubmission, input, ())

    def stream_chat_events(
        self,
        conversation_id: str,
        input: AiChatStreamInput,
        request_id: str | None = None,
    ) -> Iterator[AiChatBriefEvent]:
        """订阅消息事件流 / Stream message events

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            request_id: 可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.
            input: 订阅消息事件流 / Stream message events 的强类型请求体。 / Typed request body for streamChatEvents.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/stream"
        return self._client._stream_chat_events(suffix, input, request_id)

    def probe_event_stream(
        self,
        input: ChatStreamProbeInput,
        request_id: str | None = None,
    ) -> Iterator[ChatStreamProbeEvent]:
        """探测 SSE 连接 / Probe the SSE connection

        Args:
            request_id: 可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.
            input: 探测 SSE 连接 / Probe the SSE connection 的强类型请求体。 / Typed request body for probeEventStream.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/stream-probe"
        return self._client._probe_event_stream(suffix, input, request_id)

    def interrupt_conversation(
        self,
        conversation_id: str,
    ) -> int:
        """中断会话执行 / Interrupt conversation execution

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/interrupt"
        return self._client._request_status("DELETE", suffix, None, ())

    def compact_conversation(
        self,
        conversation_id: str,
        force: bool | None = True,
    ) -> int:
        """压缩会话上下文 / Compact conversation context

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            force: 是否忽略当前阈值并强制压缩。 / Whether to compact regardless of the current threshold.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/compact"
        query: list[QueryParameter] = []
        if force is not None:
            query.append(QueryParameter("force", _query_text(force)))
        return self._client._request_status("POST", suffix, None, query)

    def get_goal(
        self,
        conversation_id: str,
    ) -> AgentGoalView:
        """读取当前目标 / Get current goal

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/goal"
        return self._client._request_model("GET", suffix, AgentGoalView, None, ())

    def edit_goal(
        self,
        conversation_id: str,
        input: EditAgentGoalInput,
    ) -> AgentGoal:
        """编辑目标 / Edit goal

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 编辑目标 / Edit goal 的强类型请求体。 / Typed request body for editGoal.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/goal"
        return self._client._request_model("PATCH", suffix, AgentGoal, input, ())

    def get_goal_history(
        self,
        conversation_id: str,
        page: int | None = 0,
        size: int | None = 20,
    ) -> AgentGoalHistory:
        """查询目标历史 / Get goal history

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            page: 分页信息 / page metadata。
            size: 单页记录数。 / Number of records per page.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/goal/history"
        query: list[QueryParameter] = []
        if page is not None:
            query.append(QueryParameter("page", _query_text(page)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        return self._client._request_model("GET", suffix, AgentGoalHistory, None, query)

    def pause_goal(
        self,
        conversation_id: str,
        input: AgentGoalRefInput,
    ) -> AgentGoal:
        """暂停目标 / Pause goal

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 暂停目标 / Pause goal 的强类型请求体。 / Typed request body for pauseGoal.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/goal/pause"
        return self._client._request_model("POST", suffix, AgentGoal, input, ())

    def resume_goal(
        self,
        conversation_id: str,
        input: AgentGoalRefInput,
    ) -> AgentGoal:
        """恢复目标 / Resume goal

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 恢复目标 / Resume goal 的强类型请求体。 / Typed request body for resumeGoal.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/goal/resume"
        return self._client._request_model("POST", suffix, AgentGoal, input, ())

    def clear_goal(
        self,
        conversation_id: str,
        input: AgentGoalRefInput,
    ) -> AgentGoal:
        """清除目标 / Clear goal

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 清除目标 / Clear goal 的强类型请求体。 / Typed request body for clearGoal.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/goal/clear"
        return self._client._request_model("POST", suffix, AgentGoal, input, ())


class ConversationsApi:
    """conversations 分组的 channel 绑定接口。 / Channel-bound conversations operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def delete_conversation(
        self,
        conversation_id: str,
    ) -> int:
        """删除会话 / Delete a conversation

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}"
        return self._client._request_status("DELETE", suffix, None, ())

    def get_conversation_summary(
        self,
        conversation_id: str,
    ) -> ConversationSummary:
        """读取会话摘要 / Get conversation summary

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}"
        return self._client._request_model("GET", suffix, ConversationSummary, None, ())

    def get_conversation_context_usage(
        self,
        conversation_id: str,
    ) -> ConversationContextUsage:
        """读取上下文占用 / Get context usage

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/context-usage"
        return self._client._request_model("GET", suffix, ConversationContextUsage, None, ())

    def list_conversations(
        self,
        current: int | None = 0,
        size: int | None = 30,
        status: Literal["ACTIVE", "ARCHIVED", "ALL"] | None = "ACTIVE",
        keyword: str | None = None,
        group_filter: Literal["ALL", "UNGROUPED", "GROUP"] | None = "ALL",
        group_id: int | None = None,
    ) -> ConversationSummaryList:
        """分页查询会话 / List conversations

        Args:
            current: 从 0 开始的页码。 / Zero-based page index.
            size: 单页记录数。 / Number of records per page.
            status: 状态过滤条件。 / Status filter.
            keyword: 标题或正文检索关键字。 / Title or content search keyword.
            group_filter: 字段 groupFilter / group filter field。
            group_id: groupFilter 为 GROUP 时必填。 / Required when groupFilter is GROUP.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/conversations"
        query: list[QueryParameter] = []
        if current is not None:
            query.append(QueryParameter("current", _query_text(current)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        if status is not None:
            query.append(QueryParameter("status", _query_text(status)))
        if keyword is not None:
            query.append(QueryParameter("keyword", _query_text(keyword)))
        if group_filter is not None:
            query.append(QueryParameter("groupFilter", _query_text(group_filter)))
        if group_id is not None:
            query.append(QueryParameter("groupId", _query_text(group_id)))
        return self._client._request_model("GET", suffix, ConversationSummaryList, None, query)

    def list_active_conversations(
        self,
    ) -> ConversationIds:
        """查询活动会话 / List active conversations

        Args:

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/conversations/active"
        return self._client._request_model("GET", suffix, ConversationIds, None, ())

    def list_unread_conversations(
        self,
    ) -> ConversationIds:
        """查询未读会话 / List unread conversations

        Args:

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/conversations/unread"
        return self._client._request_model("GET", suffix, ConversationIds, None, ())

    def query_conversation_activities(
        self,
        input: ConversationActivityBatchInput,
    ) -> ConversationActivityList:
        """批量查询会话活动 / Query conversation activities

        Args:
            input: 批量查询会话活动 / Query conversation activities 的强类型请求体。 / Typed request body for queryConversationActivities.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/conversations/activity/query"
        return self._client._request_model("POST", suffix, ConversationActivityList, input, ())

    def mark_conversation_read(
        self,
        conversation_id: str,
        input: ConversationReadReceiptInput,
    ) -> ConversationReadReceipt:
        """推进会话已读游标 / Mark a conversation as read

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 推进会话已读游标 / Mark a conversation as read 的强类型请求体。 / Typed request body for markConversationRead.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/read-receipt"
        return self._client._request_model("PUT", suffix, ConversationReadReceipt, input, ())

    def get_conversation_stats(
        self,
    ) -> ConversationStats:
        """读取会话统计 / Get conversation statistics

        Args:

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/conversations/stats"
        return self._client._request_model("GET", suffix, ConversationStats, None, ())

    def get_conversation_title(
        self,
        conversation_id: str,
    ) -> ConversationTitle:
        """读取会话标题 / Get conversation title

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/title"
        return self._client._request_model("GET", suffix, ConversationTitle, None, ())

    def update_conversation_title(
        self,
        conversation_id: str,
        input: ConversationTitleInput,
    ) -> ConversationMetadata:
        """更新会话标题 / Update conversation title

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 更新会话标题 / Update conversation title 的强类型请求体。 / Typed request body for updateConversationTitle.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/title"
        return self._client._request_model("PATCH", suffix, ConversationMetadata, input, ())

    def update_conversation_status(
        self,
        conversation_id: str,
        input: ConversationStatusInput,
    ) -> int:
        """更新会话状态 / Update conversation status

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 更新会话状态 / Update conversation status 的强类型请求体。 / Typed request body for updateConversationStatus.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/status"
        return self._client._request_status("PATCH", suffix, input, ())

    def list_conversation_groups(
        self,
    ) -> ConversationGroupList:
        """查询会话分组 / List conversation groups

        Args:

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/conversation-groups"
        return self._client._request_model("GET", suffix, ConversationGroupList, None, ())

    def create_conversation_group(
        self,
        input: ConversationGroupNameInput,
    ) -> ConversationGroup:
        """创建会话分组 / Create conversation group

        Args:
            input: 创建会话分组 / Create conversation group 的强类型请求体。 / Typed request body for createConversationGroup.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/conversation-groups"
        return self._client._request_model("POST", suffix, ConversationGroup, input, ())

    def rename_conversation_group(
        self,
        group_id: int,
        input: ConversationGroupNameInput,
    ) -> ConversationGroup:
        """重命名会话分组 / Rename conversation group

        Args:
            group_id: 字段 groupId / group id field。
            input: 重命名会话分组 / Rename conversation group 的强类型请求体。 / Typed request body for renameConversationGroup.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversation-groups/{quote(str(group_id), safe='')}"
        return self._client._request_model("PATCH", suffix, ConversationGroup, input, ())

    def delete_conversation_group(
        self,
        group_id: int,
    ) -> ConversationGroupDeleted:
        """删除会话分组 / Delete conversation group

        Args:
            group_id: 字段 groupId / group id field。

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversation-groups/{quote(str(group_id), safe='')}"
        return self._client._request_model("DELETE", suffix, ConversationGroupDeleted, None, ())

    def move_conversation_to_group(
        self,
        conversation_id: str,
        input: UpdateConversationGroupInput,
    ) -> ConversationMetadata:
        """移动会话分组 / Move conversation to group

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            input: 移动会话分组 / Move conversation to group 的强类型请求体。 / Typed request body for moveConversationToGroup.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/group"
        return self._client._request_model("PATCH", suffix, ConversationMetadata, input, ())


class SqlApi:
    """sql 分组的 channel 绑定接口。 / Channel-bound sql operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def get_sql_query_result(
        self,
        conversation_id: str,
        result_id: str,
        current: int | None = 0,
        size: int | None = 100,
    ) -> SqlQueryResultPage:
        """分页读取 SQL 结果 / Get paged SQL results

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            result_id: SQL 查询结果 ID。 / SQL query-result ID.
            current: 从 0 开始的页码。 / Zero-based page index.
            size: 单页记录数。 / Number of records per page.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = (
            f"/conversations/{quote(str(conversation_id), safe='')}/sql-query-results/{quote(str(result_id), safe='')}"
        )
        query: list[QueryParameter] = []
        if current is not None:
            query.append(QueryParameter("current", _query_text(current)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        return self._client._request_model("GET", suffix, SqlQueryResultPage, None, query)

    def get_sql_query_chart_data(
        self,
        conversation_id: str,
        result_id: str,
    ) -> SqlChartDataset:
        """读取 SQL 图表数据 / Get SQL chart data

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            result_id: SQL 查询结果 ID。 / SQL query-result ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/sql-query-results/{quote(str(result_id), safe='')}/chart-data"
        return self._client._request_model("GET", suffix, SqlChartDataset, None, ())

    def export_sql_query_result(
        self,
        conversation_id: str,
        result_id: str,
        format: Literal["CSV", "XLSX"],
        accept: str | None = None,
    ) -> bytes:
        """导出 SQL 结果 / Export SQL results

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            result_id: SQL 查询结果 ID。 / SQL query-result ID.
            format: 导出格式。 / Export format.
            accept: 期望的导出媒体类型。 / Requested export media type.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/sql-query-results/{quote(str(result_id), safe='')}/export"
        query: list[QueryParameter] = []
        query.append(QueryParameter("format", _query_text(format)))
        return self._client._request_bytes("GET", suffix, query, accept)


class MessagesApi:
    """messages 分组的 channel 绑定接口。 / Channel-bound messages operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def list_conversation_messages(
        self,
        conversation_id: str,
        current: int | None = None,
        size: int | None = 30,
        order_by: Sequence[str] | None = None,
        order_direction: Literal["ASC", "DESC"] | None = "ASC",
        order_null_handling: Literal["NATIVE", "NULLS_FIRST", "NULLS_LAST"] | None = "NATIVE",
        keyword: str | None = None,
    ) -> ConversationMessagePage:
        """分页查询会话消息 / List conversation messages

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            current: 从 0 开始的页码。 / Zero-based page index.
            size: 单页记录数。 / Number of records per page.
            order_by: 排序字段列表。 / Ordered list of sort fields.
            order_direction: 排序方向。 / Sort direction.
            order_null_handling: 空值排序策略。 / Null ordering strategy.
            keyword: 标题或正文检索关键字。 / Title or content search keyword.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/messages"
        query: list[QueryParameter] = []
        if current is not None:
            query.append(QueryParameter("current", _query_text(current)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        if order_by is not None:
            query.extend(QueryParameter("orderBy", str(value)) for value in order_by)
        if order_direction is not None:
            query.append(QueryParameter("orderDirection", _query_text(order_direction)))
        if order_null_handling is not None:
            query.append(QueryParameter("orderNullHandling", _query_text(order_null_handling)))
        if keyword is not None:
            query.append(QueryParameter("keyword", _query_text(keyword)))
        return self._client._request_model("GET", suffix, ConversationMessagePage, None, query)

    def get_conversation_message(
        self,
        conversation_id: str,
        message_id: str,
    ) -> ConversationMessage:
        """读取单条会话消息 / Get a conversation message

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            message_id: 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/messages/{quote(str(message_id), safe='')}"
        return self._client._request_model("GET", suffix, ConversationMessage, None, ())

    def list_conversation_async_tasks(
        self,
        conversation_id: str,
        current: int | None = None,
        size: int | None = 30,
        order_by: Sequence[str] | None = None,
        order_direction: Literal["ASC", "DESC"] | None = "ASC",
        order_null_handling: Literal["NATIVE", "NULLS_FIRST", "NULLS_LAST"] | None = "NATIVE",
        keyword: str | None = None,
        status: Sequence[str] | None = None,
    ) -> AsyncTaskPage:
        """分页查询异步任务 / List asynchronous tasks

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            current: 从 0 开始的页码。 / Zero-based page index.
            size: 单页记录数。 / Number of records per page.
            order_by: 排序字段列表。 / Ordered list of sort fields.
            order_direction: 排序方向。 / Sort direction.
            order_null_handling: 空值排序策略。 / Null ordering strategy.
            keyword: 标题或正文检索关键字。 / Title or content search keyword.
            status: 状态过滤条件。 / Status filter.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/async-tasks"
        query: list[QueryParameter] = []
        if current is not None:
            query.append(QueryParameter("current", _query_text(current)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        if order_by is not None:
            query.extend(QueryParameter("orderBy", str(value)) for value in order_by)
        if order_direction is not None:
            query.append(QueryParameter("orderDirection", _query_text(order_direction)))
        if order_null_handling is not None:
            query.append(QueryParameter("orderNullHandling", _query_text(order_null_handling)))
        if keyword is not None:
            query.append(QueryParameter("keyword", _query_text(keyword)))
        if status is not None:
            query.extend(QueryParameter("status", str(value)) for value in status)
        return self._client._request_model("GET", suffix, AsyncTaskPage, None, query)

    def sync_conversation_async_tasks(
        self,
        conversation_id: str,
        after_message_id: str | None = None,
        size: int | None = 50,
    ) -> AgentAsyncTaskSync:
        """增量同步异步任务 / Sync asynchronous task updates

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            after_message_id: 通知消息同步游标。 / Notification-message sync cursor.
            size: 单页记录数。 / Number of records per page.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/async-tasks/sync"
        query: list[QueryParameter] = []
        if after_message_id is not None:
            query.append(QueryParameter("afterMessageId", _query_text(after_message_id)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        return self._client._request_model("GET", suffix, AgentAsyncTaskSync, None, query)

    def get_conversation_async_task(
        self,
        conversation_id: str,
        async_task_id: str,
    ) -> AsyncTask:
        """读取异步任务 / Get an asynchronous task

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            async_task_id: 异步任务 ID。 / Asynchronous task ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = (
            f"/conversations/{quote(str(conversation_id), safe='')}/async-tasks/{quote(str(async_task_id), safe='')}"
        )
        return self._client._request_model("GET", suffix, AsyncTask, None, ())

    def list_conversation_subagents(
        self,
        conversation_id: str,
        current: int | None = None,
        size: int | None = 30,
        order_by: Sequence[str] | None = None,
        order_direction: Literal["ASC", "DESC"] | None = "ASC",
        order_null_handling: Literal["NATIVE", "NULLS_FIRST", "NULLS_LAST"] | None = "NATIVE",
        keyword: str | None = None,
        status: Sequence[str] | None = None,
    ) -> SubagentTaskPage:
        """分页查询子 Agent 任务 / List subagent tasks

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            current: 从 0 开始的页码。 / Zero-based page index.
            size: 单页记录数。 / Number of records per page.
            order_by: 排序字段列表。 / Ordered list of sort fields.
            order_direction: 排序方向。 / Sort direction.
            order_null_handling: 空值排序策略。 / Null ordering strategy.
            keyword: 标题或正文检索关键字。 / Title or content search keyword.
            status: 状态过滤条件。 / Status filter.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/subagents"
        query: list[QueryParameter] = []
        if current is not None:
            query.append(QueryParameter("current", _query_text(current)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        if order_by is not None:
            query.extend(QueryParameter("orderBy", str(value)) for value in order_by)
        if order_direction is not None:
            query.append(QueryParameter("orderDirection", _query_text(order_direction)))
        if order_null_handling is not None:
            query.append(QueryParameter("orderNullHandling", _query_text(order_null_handling)))
        if keyword is not None:
            query.append(QueryParameter("keyword", _query_text(keyword)))
        if status is not None:
            query.extend(QueryParameter("status", str(value)) for value in status)
        return self._client._request_model("GET", suffix, SubagentTaskPage, None, query)

    def sync_conversation_subagents(
        self,
        conversation_id: str,
        cursor: str | None = None,
        size: int | None = 50,
    ) -> SubagentTaskSync:
        """增量同步子 Agent 状态 / Sync subagent task updates

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            cursor: 子 Agent 状态同步游标。 / Subagent-state sync cursor.
            size: 单页记录数。 / Number of records per page.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/subagents/sync"
        query: list[QueryParameter] = []
        if cursor is not None:
            query.append(QueryParameter("cursor", _query_text(cursor)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        return self._client._request_model("GET", suffix, SubagentTaskSync, None, query)

    def get_conversation_subagent(
        self,
        conversation_id: str,
        subagent_task_id: str,
    ) -> SubagentTask:
        """读取子 Agent 状态 / Get a subagent task

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            subagent_task_id: 子 Agent 任务 ID。 / Subagent task ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = (
            f"/conversations/{quote(str(conversation_id), safe='')}/subagents/{quote(str(subagent_task_id), safe='')}"
        )
        return self._client._request_model("GET", suffix, SubagentTask, None, ())

    def cancel_conversation_subagent(
        self,
        conversation_id: str,
        subagent_task_id: str,
    ) -> SubagentTask:
        """取消子 Agent 任务 / Cancel a subagent task

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            subagent_task_id: 子 Agent 任务 ID。 / Subagent task ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = (
            f"/conversations/{quote(str(conversation_id), safe='')}/subagents/{quote(str(subagent_task_id), safe='')}"
        )
        return self._client._request_model("DELETE", suffix, SubagentTask, None, ())

    def get_conversation_subagent_result(
        self,
        conversation_id: str,
        subagent_task_id: str,
    ) -> SubagentTaskResult:
        """读取子 Agent 结果 / Get a subagent result

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            subagent_task_id: 子 Agent 任务 ID。 / Subagent task ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/subagents/{quote(str(subagent_task_id), safe='')}/result"
        return self._client._request_model("GET", suffix, SubagentTaskResult, None, ())

    def cancel_queued_message(
        self,
        conversation_id: str,
        message_id: str,
    ) -> ConversationMessage:
        """取消排队消息 / Cancel a queued message

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            message_id: 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = (
            f"/conversations/{quote(str(conversation_id), safe='')}/messages/{quote(str(message_id), safe='')}/queue"
        )
        return self._client._request_model("DELETE", suffix, ConversationMessage, None, ())

    def sync_conversation_messages(
        self,
        conversation_id: str,
        after_message_id: str | None = None,
        size: int | None = 50,
    ) -> ConversationMessageSync:
        """增量同步消息 / Sync conversation messages

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            after_message_id: 通知消息同步游标。 / Notification-message sync cursor.
            size: 单页记录数。 / Number of records per page.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/messages/sync"
        query: list[QueryParameter] = []
        if after_message_id is not None:
            query.append(QueryParameter("afterMessageId", _query_text(after_message_id)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        return self._client._request_model("GET", suffix, ConversationMessageSync, None, query)


class EventsApi:
    """events 分组的 channel 绑定接口。 / Channel-bound events operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def get_chat_events(
        self,
        conversation_id: str,
        message_id: str,
    ) -> AiChatBriefEventList:
        """读取消息事件 / Get message events

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            message_id: 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/events"
        query: list[QueryParameter] = []
        query.append(QueryParameter("conversationId", _query_text(conversation_id)))
        query.append(QueryParameter("messageId", _query_text(message_id)))
        return self._client._request_model("GET", suffix, AiChatBriefEventList, None, query)

    def get_chat_events_batch(
        self,
        input: AiChatEventsBatchInput,
    ) -> AiChatEventsBatch:
        """批量读取消息事件 / Get message events in batch

        Args:
            input: 批量读取消息事件 / Get message events in batch 的强类型请求体。 / Typed request body for getChatEventsBatch.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/events/batch"
        return self._client._request_model("POST", suffix, AiChatEventsBatch, input, ())


class InteractionsApi:
    """interactions 分组的 channel 绑定接口。 / Channel-bound interactions operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def approve_plan(
        self,
        input: PlanApprovalInput,
    ) -> OperationResult:
        """提交计划审批 / Submit plan approval

        Args:
            input: 提交计划审批 / Submit plan approval 的强类型请求体。 / Typed request body for approvePlan.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/plan/approve"
        return self._client._request_model("POST", suffix, OperationResult, input, ())

    def get_plan_status(
        self,
        plan_id: str,
    ) -> PlanStatus:
        """查询计划审批状态 / Get plan approval status

        Args:
            plan_id: 等待审批的计划 ID。 / Pending plan-approval ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/plan/{quote(str(plan_id), safe='')}/status"
        return self._client._request_model("GET", suffix, PlanStatus, None, ())

    def get_user_input_status(
        self,
        question_id: str,
        conversation_id: str,
        message_id: str,
    ) -> UserInputStatus:
        """查询用户问答状态 / Get user-input status

        Args:
            question_id: 等待回答的问题 ID。 / Pending question ID.
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            message_id: 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/user-input/{quote(str(question_id), safe='')}/status"
        query: list[QueryParameter] = []
        query.append(QueryParameter("conversationId", _query_text(conversation_id)))
        query.append(QueryParameter("messageId", _query_text(message_id)))
        return self._client._request_model("GET", suffix, UserInputStatus, None, query)

    def answer_user_input(
        self,
        input: UserInputAnswerInput,
    ) -> OperationResult:
        """提交用户回答 / Submit a user answer

        Args:
            input: 提交用户回答 / Submit a user answer 的强类型请求体。 / Typed request body for answerUserInput.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/user-input/answer"
        return self._client._request_model("POST", suffix, OperationResult, input, ())

    def get_message_plan_status(
        self,
        conversation_id: str,
        message_id: str,
    ) -> PlanStatus:
        """查询消息计划审批状态 / Get message plan status

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            message_id: 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/messages/{quote(str(message_id), safe='')}/plan/status"
        return self._client._request_model("GET", suffix, PlanStatus, None, ())


class FilesApi:
    """files 分组的 channel 绑定接口。 / Channel-bound files operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def create_pre_signed_upload(
        self,
        input: GeneratePreSignedUrlInput,
    ) -> GeneratePreSignedUrlOutput:
        """创建预签名上传地址 / Create a presigned upload URL

        Args:
            input: 创建预签名上传地址 / Create a presigned upload URL 的强类型请求体。 / Typed request body for createPreSignedUpload.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/files/pre-signed-url/write"
        return self._client._request_model("POST", suffix, GeneratePreSignedUrlOutput, input, ())

    def confirm_pre_signed_upload(
        self,
        input: ConfirmUploadInput,
    ) -> AgentFile:
        """确认预签名上传 / Confirm a presigned upload

        Args:
            input: 确认预签名上传 / Confirm a presigned upload 的强类型请求体。 / Typed request body for confirmPreSignedUpload.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/files/pre-signed-url/confirm"
        return self._client._request_model("POST", suffix, AgentFile, input, ())

    def create_file_by_content_md5(
        self,
        input: CreateFileInput,
    ) -> AgentFile:
        """按 MD5 复用文件 / Reuse a file by MD5

        Args:
            input: 按 MD5 复用文件 / Reuse a file by MD5 的强类型请求体。 / Typed request body for createFileByContentMd5.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/files/contentMd5"
        return self._client._request_model("POST", suffix, AgentFile, input, ())

    def file_exists_by_content_md5(
        self,
        content_md5: str,
    ) -> FileExists:
        """检查 MD5 文件是否存在 / Check file existence by MD5

        Args:
            content_md5: 文件内容 MD5。 / MD5 digest of the file content.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/files/meta/contentMd5"
        query: list[QueryParameter] = []
        query.append(QueryParameter("contentMd5", _query_text(content_md5)))
        return self._client._request_model("GET", suffix, FileExists, None, query)

    def get_conversation_file_preview(
        self,
        conversation_id: str,
        file_id: int,
    ) -> PreSignedReadUrl:
        """创建会话文件预览地址 / Create a conversation file preview URL

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            file_id: 文件记录 ID。 / File record ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/files/{quote(str(file_id), safe='')}/preview"
        return self._client._request_model("GET", suffix, PreSignedReadUrl, None, ())

    def get_plan_intermediate_file_preview(
        self,
        conversation_id: str,
        message_id: str,
        file_id: int,
    ) -> PreSignedReadUrl:
        """创建计划快照预览地址 / Create a plan snapshot preview URL

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            message_id: 用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.
            file_id: 文件记录 ID。 / File record ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/messages/{quote(str(message_id), safe='')}/plan-intermediate-files/{quote(str(file_id), safe='')}/preview"
        return self._client._request_model("GET", suffix, PreSignedReadUrl, None, ())


class KnowledgeApi:
    """knowledge 分组的 channel 绑定接口。 / Channel-bound knowledge operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def get_citation_metadata_batch(
        self,
        input: Sequence[ReturnedReference],
    ) -> CitationMetadataList:
        """批量读取引用元数据 / Get citation metadata in batch

        Args:
            input: 批量读取引用元数据 / Get citation metadata in batch 的强类型请求体。 / Typed request body for getCitationMetadataBatch.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = "/knowledge-bases/citations/metadata"
        return self._client._request_model("POST", suffix, CitationMetadataList, input, ())

    def get_citation_metadata(
        self,
        citation_type: str,
        reference_id: int,
    ) -> CitationMetadata:
        """读取引用元数据 / Get citation metadata

        Args:
            citation_type: 知识引用类型。 / Knowledge citation type.
            reference_id: 知识引用记录 ID。 / Knowledge-reference record ID.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/knowledge-bases/citations/{quote(str(citation_type), safe='')}/{quote(str(reference_id), safe='')}/metadata"
        return self._client._request_model("GET", suffix, CitationMetadata, None, ())


class WorkspaceApi:
    """workspace 分组的 channel 绑定接口。 / Channel-bound workspace operations."""

    def __init__(self, client: AgentsUserClient) -> None:
        self._client = client

    def list_workspace_artifacts(
        self,
        conversation_id: str,
        current: int | None = None,
        size: int | None = 30,
        order_by: Sequence[str] | None = None,
        order_direction: Literal["ASC", "DESC"] | None = "ASC",
        order_null_handling: Literal["NATIVE", "NULLS_FIRST", "NULLS_LAST"] | None = "NATIVE",
        keyword: str | None = None,
        prefix: str | None = None,
    ) -> WorkspaceArtifactList:
        """分页查询工作区制品 / List workspace artifacts

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            current: 从 0 开始的页码。 / Zero-based page index.
            size: 单页记录数。 / Number of records per page.
            order_by: 排序字段列表。 / Ordered list of sort fields.
            order_direction: 排序方向。 / Sort direction.
            order_null_handling: 空值排序策略。 / Null ordering strategy.
            keyword: 标题或正文检索关键字。 / Title or content search keyword.
            prefix: 工作区相对路径前缀。 / Workspace-relative path prefix.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/workspace/files"
        query: list[QueryParameter] = []
        if current is not None:
            query.append(QueryParameter("current", _query_text(current)))
        if size is not None:
            query.append(QueryParameter("size", _query_text(size)))
        if order_by is not None:
            query.extend(QueryParameter("orderBy", str(value)) for value in order_by)
        if order_direction is not None:
            query.append(QueryParameter("orderDirection", _query_text(order_direction)))
        if order_null_handling is not None:
            query.append(QueryParameter("orderNullHandling", _query_text(order_null_handling)))
        if keyword is not None:
            query.append(QueryParameter("keyword", _query_text(keyword)))
        if prefix is not None:
            query.append(QueryParameter("prefix", _query_text(prefix)))
        return self._client._request_model("GET", suffix, WorkspaceArtifactList, None, query)

    def get_workspace_file_preview(
        self,
        conversation_id: str,
        path: str,
    ) -> PreSignedReadUrl:
        """创建工作区文件预览地址 / Create a workspace file preview URL

        Args:
            conversation_id: 会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.
            path: 工作区相对文件路径。 / Workspace-relative file path.

        Returns:
            契约定义的强类型响应。 / The typed response defined by the contract.
        """
        suffix = f"/conversations/{quote(str(conversation_id), safe='')}/workspace/files/preview"
        query: list[QueryParameter] = []
        query.append(QueryParameter("path", _query_text(path)))
        return self._client._request_model("GET", suffix, PreSignedReadUrl, None, query)


def _query_text(value: str | int | bool) -> str:
    """Use the lowercase JSON spelling required for boolean query values."""
    return str(value).lower() if isinstance(value, bool) else str(value)


# Imported last to avoid a runtime cycle while preserving precise annotations.
from lingya_agents_sdk.client import AgentsUserClient, QueryParameter  # noqa: E402

LingyaConfigurationApi = ConfigurationApi
LingyaChatApi = ChatApi
LingyaConversationsApi = ConversationsApi
LingyaSqlApi = SqlApi
LingyaMessagesApi = MessagesApi
LingyaEventsApi = EventsApi
LingyaInteractionsApi = InteractionsApi
LingyaFilesApi = FilesApi
LingyaKnowledgeApi = KnowledgeApi
LingyaWorkspaceApi = WorkspaceApi
