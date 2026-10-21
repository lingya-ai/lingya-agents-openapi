// Public channel additions and corrections matching OpenApiChannelChatController.
export function updateChannelContract({ spec, schemas, add, pathParam, queryParam, summaries, guides }) {
  const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
  const str = { type: "string" };
  const int = { type: "integer", format: "int32" };
  const long = { type: "integer", format: "int64" };
  const bool = { type: "boolean" };
  const date = { type: "string", format: "date-time" };
  const nullable = (schema) => ({ oneOf: [schema, { type: "null" }] });
  const array = (schema) => ({ type: "array", items: schema });
  const object = (properties, required = Object.keys(properties)) => ({ type: "object", properties: JSON.parse(JSON.stringify(properties)), required });
  const enumeration = (...values) => ({ type: "string", enum: values });
  const prefix = "/api/agents/channel/openapi/v1/{channelId}/chat";
  const conversation = [pathParam("conversationId")];
  const goalRef = { goalId: { ...str, minLength: 1, maxLength: 64 }, goalRevision: { ...int, minimum: 1 } };
  Object.assign(schemas, {
    OpenApiToken: object({ token: str, expiresAt: date }),
    AgentGoalConfig: object({ supported: bool, continuationEnabled: bool }),
    AgentGoalRefInput: object(goalRef),
    EditAgentGoalInput: object({ ...goalRef, objective: { ...str, minLength: 1, maxLength: 4000 } }),
    AgentGoal: object({
      goalId: str, goalRevision: int, objective: str,
      phase: enumeration("ACTIVE", "PAUSED", "BLOCKED", "COMPLETE"),
      recordState: enumeration("CURRENT", "CLEARED", "REPLACED"),
      activationState: enumeration("ARMED", "DISARMED"), effectivelyArmed: bool,
      blockedCode: nullable(enumeration("ROUND_LIMIT", "STEP_LIMIT", "ARTIFACT_COMMIT_FAILED", "HUMAN_INPUT_REQUIRED", "QUEUE_FAILED", "PROMPT_REJECTED", "AUTH_REVOKED", "STORAGE_UNAVAILABLE", "EXECUTION_FAILED", "MODEL_REPORTED")),
      blockedMessage: nullable(str), completionMessage: nullable(str), statusVersion: long, nextExecutionDueTime: nullable(date),
    }),
    AgentGoalView: object({ goal: nullable(ref("AgentGoal")) }),
    AgentGoalHistory: object({ items: array(ref("AgentGoal")), page: int, size: int, hasNext: bool }),
    ConversationGroupNameInput: object({ name: { ...str, minLength: 1, maxLength: 60 } }),
    UpdateConversationGroupInput: object({ groupId: nullable(long) }),
    ConversationGroup: object({ id: long, name: str, createdTime: date, lastUpdateTime: date }),
    ConversationGroupList: object({ records: array(ref("ConversationGroup")) }),
    ConversationGroupDeleted: object({ groupId: long, movedConversationCount: int }),
    ConversationMetadata: object({ conversationId: str, status: enumeration("ACTIVE", "ARCHIVED", "DELETED"), title: nullable(str), titleState: str, groupId: nullable(long), groupName: nullable(str), lastUpdateTime: date }),
    ConversationMessageSync: object({ messages: array(ref("ConversationMessage")), nextMessageId: nullable(str), hasMore: bool }),
  });
  Object.assign(schemas.AiChatInput.properties, {
    planMode: { type: ["boolean", "null"], description: "计划模式；省略时沿用会话设置。 / Plan mode; omitted values preserve the conversation setting." },
    goalMode: { type: ["boolean", "null"], description: "创建新目标；不能与计划模式同时开启，目标正文最多 4000 字符。 / Create a goal; cannot be enabled together with plan mode, and the objective is limited to 4000 characters." },
  });
  schemas.AiChatStreamInput.properties.messageId.maxLength = 64;
  schemas.AgentsConfig.properties.goal = nullable(ref("AgentGoalConfig"));
  schemas.ConversationConfig.properties.planMode = { ...bool, default: false };
  schemas.ConversationConfig.required = ["lastChatModelSpec", "planMode"];
  Object.assign(schemas.ConversationSummary.properties, { groupId: nullable(long), groupName: nullable(str) });
  schemas.ConversationSummaryList.properties.page = ref("PageInfo");
  schemas.ConversationSummaryList.required.push("page");
  delete schemas.ConversationUserMessage.properties.metadataRawJson;
  schemas.ConversationUserMessage.properties.metadata = {
    type: "object", additionalProperties: true,
    description: "消息来源定义的动态 JSON 元数据。 / Dynamic JSON metadata defined by the message source.",
  };
  schemas.ConversationUserMessage.required.push("metadata");
  for (const name of ["AiChatRequestBriefEvent", "AiChatResponseBriefEvent"]) delete schemas[name];
  schemas.AiChatBriefEvent.oneOf = schemas.AiChatBriefEvent.oneOf.filter((item) => !/AiChat(Request|Response)BriefEvent$/.test(item.$ref));
  delete schemas.AiChatBriefEvent.discriminator.mapping["chat-client-request"];
  delete schemas.AiChatBriefEvent.discriminator.mapping["chat-client-response"];
  for (const path of Object.keys(spec.paths)) if (path.includes("/shares")) delete spec.paths[path];
  for (const name of Object.keys(schemas)) if (name.startsWith("ConversationShare")) delete schemas[name];

  spec.paths[`${prefix}/conversations`].get.parameters = [pathParam("channelId"),
    queryParam("current", { ...int, minimum: 0, default: 0 }),
    queryParam("size", { ...int, minimum: 1, maximum: 100, default: 30 }),
    queryParam("status", { ...enumeration("ACTIVE", "ARCHIVED", "ALL"), default: "ACTIVE" }),
    queryParam("keyword", { ...str, maxLength: 255 }, false, "标题子串。 / Title substring."),
    queryParam("groupFilter", { ...enumeration("ALL", "UNGROUPED", "GROUP"), default: "ALL" }),
    queryParam("groupId", long, false, "groupFilter 为 GROUP 时必填。 / Required when groupFilter is GROUP."),
  ];
  spec.paths[`${prefix}/conversations/{conversationId}/title`].patch.responses = {
    ...spec.paths[`${prefix}/conversations/{conversationId}/title`].patch.responses,
    "200": { description: "Successful response", content: { "application/json": { schema: ref("ConversationMetadata") } } },
  };
  delete spec.paths[`${prefix}/conversations/{conversationId}/title`].patch.responses["202"];
  add("post", "/presign", "createOpenApiToken", "Configuration", "201", "OpenApiToken");
  add("get", "/conversations/{conversationId}", "getConversationSummary", "Conversations", "200", "ConversationSummary", { parameters: conversation });
  add("get", "/conversation-groups", "listConversationGroups", "Conversations", "200", "ConversationGroupList");
  add("post", "/conversation-groups", "createConversationGroup", "Conversations", "201", "ConversationGroup", { body: "ConversationGroupNameInput" });
  add("patch", "/conversation-groups/{groupId}", "renameConversationGroup", "Conversations", "200", "ConversationGroup", { parameters: [pathParam("groupId", "int64")], body: "ConversationGroupNameInput" });
  add("delete", "/conversation-groups/{groupId}", "deleteConversationGroup", "Conversations", "200", "ConversationGroupDeleted", { parameters: [pathParam("groupId", "int64")] });
  add("patch", "/conversations/{conversationId}/group", "moveConversationToGroup", "Conversations", "200", "ConversationMetadata", { parameters: conversation, body: "UpdateConversationGroupInput" });
  add("get", "/conversations/{conversationId}/messages/sync", "syncConversationMessages", "Messages", "200", "ConversationMessageSync", { parameters: [...conversation,
    queryParam("afterMessageId", { ...str, minLength: 1, maxLength: 64 }), queryParam("size", { ...int, minimum: 1, maximum: 50, default: 50 })] });
  add("get", "/conversations/{conversationId}/messages/{messageId}/plan/status", "getMessagePlanStatus", "Interactions", "200", "PlanStatus", { parameters: [...conversation, pathParam("messageId")] });
  add("get", "/conversations/{conversationId}/goal", "getGoal", "Chat", "200", "AgentGoalView", { parameters: conversation });
  add("get", "/conversations/{conversationId}/goal/history", "getGoalHistory", "Chat", "200", "AgentGoalHistory", { parameters: [...conversation, queryParam("page", { ...int, default: 0 }), queryParam("size", { ...int, default: 20 })] });
  add("patch", "/conversations/{conversationId}/goal", "editGoal", "Chat", "200", "AgentGoal", { parameters: conversation, body: "EditAgentGoalInput" });
  for (const action of ["pause", "resume", "clear"]) add("post", `/conversations/{conversationId}/goal/${action}`, `${action}Goal`, "Chat", "201", "AgentGoal", { parameters: conversation, body: "AgentGoalRefInput" });
  const hmac = spec.security[0];
  const tokenUsage = "十分钟内有效的一次性渠道令牌，绑定签发时的渠道和用户身份。截止 expiresAt 前仅能认证一个新请求；认证成功即消费，业务失败不退还。每次新请求、重试或 SSE/WebSocket 重连都必须重新签发，不得缓存复用。使用 X-OpenAPI-Token，与所有 HMAC 鉴权头互斥，不能用于 presign。 / A single-use channel token valid for ten minutes, bound to the issuing channel and user. It authenticates only one new request before expiresAt and is consumed on successful authentication even if the business operation fails. Obtain a fresh token for every new request, retry, or SSE/WebSocket reconnection; never cache or reuse it. Send X-OpenAPI-Token without any HMAC authentication headers; tokens cannot call presign.";
  schemas.OpenApiToken.description = tokenUsage;
  schemas.OpenApiToken.properties.token.description = "一次性令牌原文，不得写入日志。 / Single-use token; never log its value.";
  schemas.OpenApiToken.properties.expiresAt.description = "未消费令牌的截止时间，不代表截止前可以重复使用。 / Deadline for an unused token, not a reusable session lifetime.";
  spec.components.securitySchemes.OpenApiToken = { type: "apiKey", in: "header", name: "X-OpenAPI-Token", description: tokenUsage };
  spec.security.push({ OpenApiToken: [] });
  const presign = spec.paths[`${prefix}/presign`].post;
  presign.security = [hmac];
  presign.responses["201"].headers = { "Cache-Control": { schema: { type: "string", const: "no-store" } } };
  const descriptions = {
    createOpenApiToken: ["签发一次性短期渠道令牌 / Create a single-use short-lived channel token", "仅接受 AK/SK 签名且请求体必须为空；返回 token 和 expiresAt。" + tokenUsage.split(" / ")[0], "Requires AK/SK signing with an empty request body; returns token and expiresAt. " + tokenUsage.split(" / ")[1]],
    getConversationSummary: ["读取会话摘要 / Get conversation summary", "按会话标识恢复当前用户的会话摘要。", "Restore the current user's conversation summary by ID."],
    listConversationGroups: ["查询会话分组 / List conversation groups", "一次读取当前用户作用域下的完整分组目录。", "Read the complete group directory for the current user."],
    createConversationGroup: ["创建会话分组 / Create conversation group", "去除名称首尾空白后创建分组，名称最多 60 字符。", "Create a group after trimming the name; names are limited to 60 characters."],
    renameConversationGroup: ["重命名会话分组 / Rename conversation group", "更新当前用户的分组名称。", "Update the name of a group owned by the current user."],
    deleteConversationGroup: ["删除会话分组 / Delete conversation group", "删除分组并将会话移回未分组，返回移动数量。", "Delete the group and move its conversations to ungrouped; return the moved count."],
    moveConversationToGroup: ["移动会话分组 / Move conversation to group", "必须显式提供 groupId；null 表示移回未分组。", "Supply groupId explicitly; null moves the conversation to ungrouped."],
    syncConversationMessages: ["增量同步消息 / Sync conversation messages", "按公开消息游标读取新增消息；无新增时保留原游标。", "Read new public messages after a cursor; retain the cursor if no new messages exist."],
    getMessagePlanStatus: ["查询消息计划审批状态 / Get message plan status", "使用 conversationId 和 messageId 检查计划审批是否仍在等待。", "Check whether plan approval is pending using conversationId and messageId."],
    getGoal: ["读取当前目标 / Get current goal", "无当前目标时返回 goal=null。", "Return goal=null when no current goal exists."],
    getGoalHistory: ["查询目标历史 / Get goal history", "分页读取当前会话的目标历史。", "Read paged goal history for the conversation."],
    editGoal: ["编辑目标 / Edit goal", "携带 goalId 和 goalRevision 更新目标正文，不改变激活状态；陈旧版本返回 409，失效目标返回 410。", "Update the objective with goalId and goalRevision without changing activation; stale revisions return 409 and invalidated goals return 410."],
    pauseGoal: ["暂停目标 / Pause goal", "携带目标标识与版本，暂停并撤销自动续跑授权。", "Pause the identified goal at the expected revision and revoke automatic continuation."],
    resumeGoal: ["恢复目标 / Resume goal", "携带目标标识与版本，恢复目标并重新授予自动续跑授权。", "Resume the identified goal at the expected revision and authorize automatic continuation."],
    clearGoal: ["清除目标 / Clear goal", "携带目标标识与版本，清除目标并保留墓碑。", "Clear the identified goal at the expected revision and preserve its tombstone."],
  };
  for (const [id, [summary, zh, en]] of Object.entries(descriptions)) {
    summaries[id] = summary;
    guides[id] = { use: { zh, en }, prerequisite: { zh: "有效渠道身份；会话资源必须属于当前用户。", en: "Valid channel identity; conversation resources must belong to the current user." }, effect: { zh, en }, next: { zh: "根据返回的权威状态更新客户端。", en: "Update the client using the returned authoritative state." } };
  }
  for (const action of ["edit", "pause", "resume", "clear"]) {
    const method = action === "edit" ? "patch" : "post";
    const path = `${prefix}/conversations/{conversationId}/goal${action === "edit" ? "" : `/${action}`}`;
    for (const status of ["409", "410"]) spec.paths[path][method].responses[status] = { $ref: "#/components/responses/Error" };
  }
  spec.info.description += "\n\n短期令牌 / Short-lived tokens: " + tokenUsage + " POST /chat/presign uses an empty AK/SK-signed request. Keep OPENAPI_SK on a trusted server.\n\nWebSocket: GET /chat/conversations/{conversationId}/stream/ws?messageId=... upgrades the connection; the full prefix is /api/agents/channel/openapi/v1/{channelId}. Authenticate with HMAC, X-OpenAPI-Token, or the xlt-openapi-token.<token> WebSocket subprotocol. A fresh token is required for every new connection; expiry limits connection authentication, not the lifetime of an established stream. Internal chat-client-request and chat-client-response events are excluded from the public protocol.";
  guides.updateConversationTitle.effect = { zh: "同步更新标题并返回权威会话元数据。", en: "Update the title and return authoritative conversation metadata." };
}
