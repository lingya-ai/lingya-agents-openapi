const guide = (useZh, useEn, prerequisiteZh, prerequisiteEn, effectZh, effectEn, nextZh, nextEn) => ({
  use: { zh: useZh, en: useEn },
  prerequisite: { zh: prerequisiteZh, en: prerequisiteEn },
  effect: { zh: effectZh, en: effectEn },
  next: { zh: nextZh, en: nextEn },
});

export const groupGuides = {
  Configuration: {
    zh: "用于在服务启动或进入会话前读取 Agent 能力、可选模型、附件限制以及会话当前配置。典型顺序是先读取渠道配置，再按需读取指定会话配置。配置结果应作为客户端校验依据，不要硬编码模型或附件限制。所有资源仍受 channelId 和外部用户隔离。",
    en: "Use this group at service startup or before a conversation to discover Agent capabilities, selectable models, attachment limits, and the current conversation configuration. Read channel configuration first, then fetch a conversation configuration when needed. Treat the response as the client-side validation source instead of hard-coding model or attachment limits. All resources remain isolated by channelId and external user.",
  },
  Chat: {
    zh: "用于创建或继续会话、订阅实时 SSE、探测流式连接、中断执行及压缩上下文。典型顺序是读取配置，按需上传文件，创建消息，再订阅 SSE；只有在执行中断或上下文接近上限时调用中断或压缩。不要把 SSE 断开等同于服务端执行结束。",
    en: "Use this group to create or continue conversations, consume live SSE events, probe streaming connectivity, interrupt execution, and compact context. A typical flow reads configuration, uploads files if needed, submits a message, and then subscribes to SSE. Interrupt or compact only when execution or context state requires it. Do not treat an SSE disconnect as proof that server-side execution ended.",
  },
  Conversations: {
    zh: "用于管理会话生命周期和聚合状态，包括列表、活动/未读状态、已读游标、统计、标题、业务状态、分享和删除。列表适合工作台展示，活动查询适合轮询补偿，分享接口只应在明确需要对外共享时使用。删除和撤销分享会改变持久状态。",
    en: "Use this group to manage conversation lifecycle and aggregate state, including lists, active or unread state, read cursors, statistics, titles, business status, sharing, and deletion. Lists support workspace views, activity queries support polling recovery, and sharing should be used only for deliberate external access. Deletion and share revocation mutate persistent state.",
  },
  Messages: {
    zh: "用于读取会话消息、异步任务和排队状态，以及取消尚未执行的排队消息。消息详情适合审计与结果恢复，异步任务接口用于跟踪长任务。取消接口只对仍在队列中的消息有效，不能代替执行中的中断接口。",
    en: "Use this group to read conversation messages, asynchronous tasks, and queue state, and to cancel messages that have not started. Message detail supports auditing and result recovery, while task endpoints track long-running work. Queue cancellation applies only to queued messages and does not replace interruption of active execution.",
  },
  Events: {
    zh: "用于在 SSE 中断、客户端重启或需要审计时补取已持久化事件。单消息查询适合精确恢复，批量查询适合一次恢复多条消息。事件补取不会重新触发 Agent 执行，也不能替代实时 SSE。",
    en: "Use this group to recover persisted events after an SSE interruption, client restart, or during auditing. The single-message endpoint performs precise recovery, while the batch endpoint restores multiple messages. Event retrieval does not re-run Agent execution and does not replace live SSE.",
  },
  Interactions: {
    zh: "用于处理 Agent 执行期间产生的计划审批和用户问答。客户端通常从 SSE 工具事件取得 planId 或 questionId，查询状态后提交审批或回答。必须同时保持原 conversationId、messageId 和问题标识，重复提交应按返回状态处理。",
    en: "Use this group for plan approvals and user questions produced during Agent execution. Clients normally obtain planId or questionId from SSE tool events, inspect status, and then submit an approval or answer. Preserve the original conversationId, messageId, and interaction identifier, and handle duplicate submissions according to the returned state.",
  },
  Files: {
    zh: "用于附件去重、预签名上传、上传确认和预览。推荐先按 MD5 检查或复用文件；需要上传时依次申请预签名地址、直接上传对象存储、再确认上传。预签名地址有时效，确认前不得把文件 ID 用于聊天。",
    en: "Use this group for attachment deduplication, presigned uploads, upload confirmation, and previews. Prefer checking or reusing a file by MD5. For a new upload, request a presigned URL, upload directly to object storage, and then confirm the upload. Presigned URLs expire, and a file ID must not be used in chat before confirmation.",
  },
  Knowledge: {
    zh: "用于把消息或工具事件中的知识引用解析为可展示的来源元数据。单条接口适合按需展开，批量接口适合一次渲染整条回答的引用列表。调用方应使用服务端返回的引用类型和 ID，不要自行猜测知识库内部地址。",
    en: "Use this group to resolve knowledge references from messages or tool events into displayable source metadata. Use the single endpoint for on-demand expansion and the batch endpoint to render all citations for an answer. Use the citation type and ID returned by the server rather than guessing internal knowledge-base locations.",
  },
  Workspace: {
    zh: "用于浏览 Agent 在会话工作区生成的文件和非文件制品，并为具体路径创建预览地址。先分页列出制品，再对文件路径请求预览。路径必须来自工作区列表并保持原始相对路径，不能作为任意文件系统路径使用。",
    en: "Use this group to browse files and non-file artifacts produced in a conversation workspace and to create preview URLs for specific paths. List artifacts first, then request a preview for a returned file path. Preserve the workspace-relative path exactly and never treat it as an arbitrary filesystem path.",
  },
  SQL: {
    zh: "用于读取 SQL 工具产生的结果集、图表数据和导出文件。resultId 来自聊天事件或消息工具扩展；先分页读取以检查数据，再按需读取图表或导出 CSV/XLSX。导出是二进制流，不能按 JSON 解析。",
    en: "Use this group to read result sets, chart data, and export files produced by the SQL tool. Obtain resultId from chat events or message tool extensions, inspect paged data first, and then fetch chart data or export CSV/XLSX as needed. Exports are binary streams and must not be parsed as JSON.",
  },
};

const userOwned = ["渠道凭证和外部用户已配置，目标资源属于当前用户。", "Channel credentials and the external user are configured, and the target resource belongs to that user."];

export const operationGuides = {
  getAgentsConfig: guide("在初始化客户端能力或展示模型选择器前读取渠道配置。", "Read channel configuration before initializing client capabilities or showing model choices.", "仅需有效渠道凭证。", "Only valid channel credentials are required.", "只读，不修改配置。", "Read-only; no configuration is changed.", "按附件限制准备文件，或创建会话。", "Prepare files according to the limits or create a conversation."),
  getConversationConfig: guide("恢复会话时读取该会话最近使用的模型配置。", "Read the most recently used model configuration when resuming a conversation.", ...userOwned, "只读，不修改会话。", "Read-only; the conversation is unchanged.", "继续提交消息或展示当前模型。", "Submit another message or display the current model."),
  createChat: guide("创建新会话并提交第一条用户消息。", "Create a conversation and submit its first user message.", "已读取配置；引用的文件已经确认上传。", "Configuration has been read and referenced files are confirmed uploads.", "创建会话和消息，并安排 Agent 执行。", "Creates a conversation and message and schedules Agent execution.", "使用返回的 conversationId 和 messageId 订阅 SSE。", "Use the returned conversationId and messageId to subscribe to SSE."),
  continueChat: guide("在已有会话中提交下一轮用户消息。", "Submit the next user turn to an existing conversation.", ...userOwned, "创建新消息并安排继续执行。", "Creates a new message and schedules continued execution.", "订阅该 messageId 的 SSE 或稍后补取事件。", "Subscribe to SSE for the messageId or recover its events later."),
  streamChatEvents: guide("实时接收指定消息的思考、工具、回答和结束事件。", "Receive thought, tool, answer, and completion events for a message in real time.", "消息已经创建且 messageId 与会话匹配。", "The message exists and its messageId belongs to the conversation.", "保持流式连接；断开不会取消服务端执行。", "Keeps a streaming connection; disconnecting does not cancel server execution.", "正常 EOF 后读取消息详情；异常断开时使用 Events 补取。", "After normal EOF read message detail; after an unexpected disconnect recover through Events."),
  probeEventStream: guide("在接入或排障时验证网关、代理和客户端对 SSE 的支持。", "Verify SSE support across the gateway, proxy, and client during integration or diagnosis.", "准备符合格式的 probeId。", "Prepare a valid probeId.", "只产生诊断事件，不创建业务会话。", "Produces diagnostic events without creating a business conversation.", "确认分片、心跳和 EOF 行为后再接入正式流。", "Confirm chunking, heartbeat, and EOF behavior before using the production stream."),
  interruptConversation: guide("用户主动停止正在执行的会话。", "Stop an actively executing conversation at the user's request.", ...userOwned, "请求终止当前执行；已完成输出不会回滚。", "Requests termination of active execution; completed output is not rolled back.", "查询活动状态或消息详情确认终态。", "Query activity or message detail to confirm the terminal state."),
  compactConversation: guide("上下文接近模型上限或用户要求时触发压缩。", "Trigger context compaction near the model limit or on explicit user request.", ...userOwned, "异步安排上下文压缩。", "Schedules asynchronous context compaction.", "轮询上下文占用或等待相关事件。", "Poll context usage or wait for related events."),
  deleteConversation: guide("永久移除用户不再需要的会话。", "Permanently remove a conversation the user no longer needs.", ...userOwned, "删除会话及其可见关联数据。", "Deletes the conversation and its visible related data.", "从本地列表和缓存中移除该会话。", "Remove the conversation from local lists and caches."),
  getConversationContextUsage: guide("决定是否需要压缩上下文或提示容量时读取占用。", "Read context usage to decide whether to compact or warn about capacity.", ...userOwned, "只读。", "Read-only.", "达到阈值时调用 compactConversation。", "Call compactConversation when the threshold is reached."),
  listConversations: guide("构建用户的分页会话列表与搜索结果。", "Build the user's paged conversation list and search results.", "外部用户已配置。", "The external user is configured.", "只读，返回分页记录。", "Read-only and returns paged records.", "按需读取标题、活动状态或消息。", "Read titles, activity, or messages as needed."),
  listActiveConversations: guide("快速恢复当前仍在执行的会话。", "Quickly recover conversations that are still executing.", "外部用户已配置。", "The external user is configured.", "只读，返回会话 ID。", "Read-only and returns conversation IDs.", "批量查询活动详情或重新连接 SSE。", "Batch-query activity details or reconnect SSE."),
  listUnreadConversations: guide("显示存在未读完成结果的会话角标。", "Display conversations with unread completed results.", "外部用户已配置。", "The external user is configured.", "只读，返回未读会话 ID。", "Read-only and returns unread conversation IDs.", "读取消息后推进已读游标。", "Advance the read cursor after reading messages."),
  queryConversationActivities: guide("批量刷新多个会话的执行与未读状态。", "Refresh execution and unread state for multiple conversations in one request.", "已持有最多 1000 个当前用户的会话 ID。", "Up to 1000 conversation IDs for the current user are available.", "只读，返回每个会话的活动投影。", "Read-only and returns an activity projection per conversation.", "更新列表状态并恢复必要的流。", "Update list state and recover any required streams."),
  markConversationRead: guide("用户查看结果后推进会话已读位置。", "Advance a conversation's read position after the user views a result.", ...userOwned, "更新已读游标，不删除消息。", "Updates the read cursor without deleting messages.", "刷新未读会话列表。", "Refresh the unread conversation list."),
  getConversationStats: guide("展示当前用户在渠道中的会话聚合统计。", "Display aggregate conversation statistics for the current user in the channel.", "外部用户已配置。", "The external user is configured.", "只读。", "Read-only.", "用于仪表盘展示，不作为逐会话状态来源。", "Use for dashboards, not as per-conversation state."),
  getConversationTitle: guide("读取自动生成或用户设置的会话标题。", "Read the generated or user-defined conversation title.", ...userOwned, "只读。", "Read-only.", "生成中时稍后重试，或允许用户更新标题。", "Retry while generation is pending or let the user update the title."),
  updateConversationTitle: guide("保存用户编辑的会话标题。", "Save a user-edited conversation title.", ...userOwned, "异步更新标题。", "Updates the title asynchronously.", "重新读取标题或刷新列表。", "Read the title again or refresh the list."),
  updateConversationStatus: guide("归档、恢复或切换会话业务状态。", "Archive, restore, or otherwise change conversation business status.", ...userOwned, "异步更新会话状态。", "Updates conversation status asynchronously.", "按新状态刷新会话列表。", "Refresh conversation lists using the new status."),
  listConversationShares: guide("查看会话当前创建的分享记录。", "Inspect the conversation's current share records.", ...userOwned, "只读。", "Read-only.", "按需创建新分享或撤销旧分享。", "Create a new share or revoke an existing one as needed."),
  createConversationShare: guide("为会话创建受控的外部分享。", "Create controlled external sharing for a conversation.", ...userOwned, "创建新的分享记录和分享码。", "Creates a share record and share code.", "安全地交付分享信息，并定期检查有效期。", "Deliver share information securely and monitor its expiry."),
  revokeConversationShare: guide("使不再需要的分享立即失效。", "Invalidate a share that is no longer needed.", ...userOwned, "撤销指定分享，不删除原会话。", "Revokes the selected share without deleting the conversation.", "刷新分享列表并停止分发旧链接。", "Refresh the share list and stop distributing the old link."),
  getSqlQueryResult: guide("分页查看 SQL 工具返回的表格数据。", "Inspect tabular data returned by the SQL tool page by page.", "从事件或消息中取得 conversationId 和 resultId。", "Obtain conversationId and resultId from an event or message.", "只读，返回当前页和列定义。", "Read-only and returns a page plus column definitions.", "按需读取图表数据或导出。", "Read chart data or export as needed."),
  getSqlQueryChartData: guide("取得适合前端图表渲染的 SQL 数据集。", "Obtain a SQL dataset prepared for chart rendering.", "resultId 对应可图表化的 SQL 结果。", "The resultId identifies a chartable SQL result.", "只读。", "Read-only.", "按返回的列类型构建图表。", "Build charts using the returned column types."),
  exportSqlQueryResult: guide("把完整 SQL 结果下载为 CSV 或 XLSX。", "Download the complete SQL result as CSV or XLSX.", "resultId 有效，format 与 Accept 匹配。", "The resultId is valid and format matches Accept.", "返回二进制下载流。", "Returns a binary download stream.", "按 Content-Disposition 保存文件，不要解析为 JSON。", "Save using Content-Disposition and do not parse as JSON."),
  listConversationMessages: guide("分页加载会话历史记录。", "Load conversation history page by page.", ...userOwned, "只读，返回消息分页。", "Read-only and returns a message page.", "选择消息后读取详情或事件。", "Read message detail or events after selection."),
  getConversationMessage: guide("恢复或审计单条消息的完整状态。", "Recover or audit the complete state of one message.", ...userOwned, "只读。", "Read-only.", "根据状态读取事件、异步任务或工具结果。", "Read events, asynchronous tasks, or tool results according to status."),
  listConversationAsyncTasks: guide("分页查看会话产生的长任务。", "List long-running tasks produced by a conversation.", ...userOwned, "只读。", "Read-only.", "对未完成任务读取详情并轮询。", "Read and poll details for unfinished tasks."),
  getConversationAsyncTask: guide("查看单个异步任务的进度与输出。", "Inspect progress and output for one asynchronous task.", ...userOwned, "只读。", "Read-only.", "完成后消费输出，失败时展示明确错误。", "Consume output on completion and show explicit errors on failure."),
  cancelQueuedMessage: guide("在消息尚未开始执行时取消排队。", "Cancel a message before execution begins.", ...userOwned, "尝试把排队消息置为取消状态。", "Attempts to move a queued message to cancelled state.", "读取消息确认结果；执行中的消息改用 interrupt。", "Read the message to confirm; use interrupt for active execution."),
  getChatEvents: guide("恢复单条消息已经持久化的事件。", "Recover persisted events for one message.", "conversationId 与 messageId 匹配。", "conversationId and messageId match.", "只读，不重新执行 Agent。", "Read-only and does not re-run the Agent.", "重建 UI 状态或与 SSE 后续事件合并。", "Rebuild UI state or merge with later SSE events."),
  getChatEventsBatch: guide("客户端重启后一次恢复多条消息事件。", "Recover events for multiple messages after a client restart.", "请求包含一个会话和最多 50 个消息 ID。", "The request contains one conversation and up to 50 message IDs.", "只读，并明确返回跳过项。", "Read-only and explicitly reports skipped items.", "按 messageId 合并记录并处理 skipped。", "Merge records by messageId and handle skipped entries."),
  approvePlan: guide("响应 Agent 发出的计划审批请求。", "Respond to a plan-approval request emitted by the Agent.", "从事件取得 planId、conversationId 和 messageId。", "Obtain planId, conversationId, and messageId from the event.", "提交批准或拒绝，可能推动执行继续。", "Submits approval or rejection and may resume execution.", "查询计划状态并继续监听事件。", "Check plan status and continue listening for events."),
  getPlanStatus: guide("确认计划是否仍在等待或已经处理。", "Check whether a plan is still pending or has been handled.", "持有事件返回的 planId。", "A planId returned by an event is available.", "只读。", "Read-only.", "pending 时等待用户操作，否则刷新执行状态。", "Wait for user action while pending; otherwise refresh execution state."),
  getUserInputStatus: guide("恢复页面时确认 Agent 问题是否仍待回答。", "Check whether an Agent question is still awaiting an answer after restoring a page.", "questionId、conversationId 和 messageId 来自同一事件。", "questionId, conversationId, and messageId come from the same event.", "只读。", "Read-only.", "仍 pending 时展示问题，否则继续恢复事件。", "Show the question while pending; otherwise continue event recovery."),
  answerUserInput: guide("提交用户对 Agent 问题的选项或自定义回答。", "Submit selected options or custom input for an Agent question.", "问题仍处于 pending 且标识与消息匹配。", "The question is pending and identifiers match the message.", "保存回答并可能推动执行继续。", "Stores the answer and may resume execution.", "继续监听 SSE 或查询消息状态。", "Continue listening to SSE or query message state."),
  createPreSignedUpload: guide("为需要上传的新附件申请对象存储地址。", "Request an object-storage URL for a new attachment.", "已计算文件 MD5，文件模块为 ai-chat-attachments。", "The file MD5 is known and the module is ai-chat-attachments.", "创建短期上传授权，不代表上传完成。", "Creates short-lived upload authorization; upload is not yet complete.", "按返回 headers 上传文件，再调用确认接口。", "Upload with the returned headers, then call confirmation."),
  confirmPreSignedUpload: guide("对象存储上传成功后登记文件。", "Register a file after object-storage upload succeeds.", "持有预签名响应的 fileUk 和同一 contentMd5。", "The fileUk and matching contentMd5 from the presign response are available.", "确认文件并返回可用于聊天的文件记录。", "Confirms the file and returns a record usable in chat.", "把返回的文件 ID 放入聊天请求。", "Place the returned file ID in a chat request."),
  createFileByContentMd5: guide("复用服务端已经存在的相同内容文件。", "Reuse an existing server-side file with identical content.", "已计算 MD5 并确认内容可复用。", "The MD5 is known and the content is safe to reuse.", "创建当前用户可引用的文件记录，不上传字节。", "Creates a user-visible file record without uploading bytes.", "把返回的文件 ID 放入聊天请求。", "Place the returned file ID in a chat request."),
  fileExistsByContentMd5: guide("上传前检查相同内容是否已经存在。", "Check whether identical content exists before uploading.", "已计算文件 MD5。", "The file MD5 is known.", "只读。", "Read-only.", "存在时尝试复用，否则走预签名上传。", "Attempt reuse when present; otherwise use presigned upload."),
  getConversationFilePreview: guide("为会话附件创建短期预览地址。", "Create a short-lived preview URL for a conversation attachment.", ...userOwned, "生成临时读取授权，不修改文件。", "Creates temporary read authorization without changing the file.", "在过期前打开或下载 URL。", "Open or download the URL before it expires."),
  getPlanIntermediateFilePreview: guide("预览计划执行过程中生成的中间文件。", "Preview an intermediate file produced during plan execution.", ...userOwned, "生成临时读取授权。", "Creates temporary read authorization.", "在过期前使用 URL，并保留消息上下文。", "Use the URL before expiry and preserve message context."),
  getCitationMetadataBatch: guide("一次解析回答中的多条知识引用。", "Resolve multiple knowledge citations from an answer in one request.", "引用列表来自服务端消息或事件。", "The reference list comes from a server message or event.", "只读，返回可展示元数据。", "Read-only and returns display metadata.", "按原引用顺序渲染来源。", "Render sources in the original reference order."),
  getCitationMetadata: guide("用户展开单条引用时读取来源详情。", "Read source detail when a user expands one citation.", "citationType 与 referenceId 来自服务端。", "citationType and referenceId come from the server.", "只读。", "Read-only.", "展示标题、位置和其他元数据。", "Display title, location, and other metadata."),
  listWorkspaceArtifacts: guide("分页浏览会话工作区中的生成制品。", "Browse generated artifacts in a conversation workspace page by page.", ...userOwned, "只读，返回文件及非文件制品。", "Read-only and returns file and non-file artifacts.", "对文件路径请求预览，或展示非文件制品。", "Request previews for file paths or display non-file artifacts."),
  getWorkspaceFilePreview: guide("为工作区中的具体文件创建预览地址。", "Create a preview URL for a specific workspace file.", "path 来自工作区列表且属于当前会话。", "The path comes from the workspace list and belongs to the conversation.", "生成临时读取授权。", "Creates temporary read authorization.", "在过期前使用 URL。", "Use the URL before it expires."),
};

export function formatOperationDescription(summary, details) {
  return [
    `### 使用场景\n${details.use.zh}\n\n### Use case\n${details.use.en}`,
    `### 前置条件\n${details.prerequisite.zh}\n\n### Prerequisites\n${details.prerequisite.en}`,
    `### 行为与副作用\n${details.effect.zh}\n\n### Behavior and side effects\n${details.effect.en}`,
    `### 后续调用\n${details.next.zh}\n\n### Next step\n${details.next.en}`,
    `### 接口摘要\n${summary}\n\n### Operation summary\n${summary}`,
  ].join("\n\n");
}
