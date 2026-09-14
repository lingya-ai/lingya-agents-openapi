import { createHash, createHmac } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import YAML from "yaml";

const root = new URL("../", import.meta.url);
const contractDir = new URL("openapi/", root);
await mkdir(contractDir, { recursive: true });

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const jsonResponse = (description, schema) => ({
  description,
  content: { "application/json": { schema } },
});
const emptyResponse = (description) => ({ description });
const body = (schema, required = true) => ({
  required,
  content: { "application/json": { schema } },
});
const pathParam = (name, format) => ({
  name,
  in: "path",
  required: true,
  schema: format === "int64" ? { type: "integer", format } : { type: "string", minLength: 1 },
});
const queryParam = (name, schema = { type: "string" }, required = false, description) => ({
  name,
  in: "query",
  required,
  schema,
  ...(description ? { description } : {}),
});
const headerParam = (name, description) => ({
  name,
  in: "header",
  required: false,
  schema: { type: "string" },
  description,
});
const pageParams = [
  queryParam("current", { type: "integer", format: "int32", minimum: 0 }),
  queryParam("size", { type: "integer", format: "int32", minimum: 0, maximum: 1000, default: 30 }),
  queryParam("orderBy", { type: "array", items: { type: "string" } }),
  queryParam("orderDirection", { type: "string", enum: ["ASC", "DESC"], default: "ASC" }),
  queryParam("orderNullHandling", { type: "string", enum: ["NATIVE", "NULLS_FIRST", "NULLS_LAST"], default: "NATIVE" }),
  queryParam("keyword"),
];

const schemas = {
  CodeMessage: {
    type: "object",
    required: ["code", "message"],
    properties: { code: { type: "string" }, message: { type: "string" } },
  },
  FieldError: {
    type: "object",
    required: ["field", "message"],
    properties: { field: { type: "string" }, message: { type: "string" } },
  },
  ValidationError: {
    type: "object",
    required: ["code", "message", "fields"],
    properties: {
      code: { type: "string" },
      message: { type: "string" },
      fields: { type: "array", items: ref("FieldError") },
    },
  },
  PageInfo: {
    type: "object",
    required: ["current", "size", "total"],
    properties: {
      current: { type: "integer", format: "int32", minimum: 0 },
      size: { type: "integer", format: "int32", minimum: 0 },
      total: { type: "integer", format: "int64", minimum: 0 },
    },
  },
  ChatModelSpec: {
    type: "object",
    properties: {
      provider: { type: "string" }, model: { type: "string" }, keyGroupId: { type: "integer", format: "int64" },
    },
    additionalProperties: true,
  },
  AttachmentExtension: {
    type: "object",
    required: ["ext", "media"],
    properties: {
      ext: { type: "string" },
      media: { type: "string" },
    },
  },
  DefaultModel: {
    type: "object",
    required: ["keyGroupId", "model"],
    properties: {
      keyGroupId: { type: "integer", format: "int64" },
      model: { type: "string" },
    },
  },
  ChatModelConfig: {
    type: "object",
    required: ["maker", "modelName", "modelLabel", "modelDescription", "maxContextTokens", "maxOutputTokens", "supportImage", "supportVideo", "thinkingMode"],
    properties: {
      maker: { type: "string" },
      modelName: { type: "string" },
      modelLabel: { type: "string" },
      modelDescription: { type: "string" },
      maxContextTokens: { type: "integer", format: "int32" },
      maxOutputTokens: { type: "integer", format: "int32" },
      supportImage: { type: "boolean" },
      supportVideo: { type: "boolean" },
      thinkingMode: { type: "boolean" },
    },
  },
  ModelKeyGroup: {
    type: "object",
    required: ["keyGroupId", "keyGroupName", "models"],
    properties: {
      keyGroupId: { type: "integer", format: "int64" },
      keyGroupName: { type: "string" },
      models: { type: "array", items: ref("ChatModelConfig") },
    },
  },
  ModelConfig: {
    type: "object",
    required: ["defaultModel", "modelKeyGroups"],
    properties: {
      defaultModel: { oneOf: [ref("DefaultModel"), { type: "null" }] },
      modelKeyGroups: { type: "array", items: ref("ModelKeyGroup") },
    },
  },
  AiChatFileRef: {
    type: "object",
    required: ["fileId"],
    properties: { fileId: { type: "integer", format: "int64" }, fileName: { type: "string" } },
    additionalProperties: true,
  },
  AiChatInput: {
    type: "object",
    required: ["query"],
    properties: {
      query: { type: "string", minLength: 1 },
      conversationId: { type: ["string", "null"] },
      chatModelSpec: { oneOf: [ref("ChatModelSpec"), { type: "null" }] },
      files: { type: ["array", "null"], items: ref("AiChatFileRef") },
    },
  },
  AiChatStreamInput: {
    type: "object",
    required: ["messageId"],
    properties: { messageId: { type: "string", minLength: 1 } },
  },
  AiChatSubmission: {
    type: "object",
    required: ["conversationId", "messageId", "disposition", "status"],
    properties: {
      conversationId: { type: "string" }, messageId: { type: "string" },
      disposition: { type: "string", description: "Dispatch disposition. Unknown future values must be preserved." },
      status: { type: "string", description: "Persisted message status. Unknown future values must be preserved." },
    },
  },
  AgentsConfig: {
    type: "object",
    required: ["modelConfig", "supportAttachmentExt", "maxAttachmentCount"],
    properties: {
      modelConfig: ref("ModelConfig"),
      supportAttachmentExt: { type: "array", items: ref("AttachmentExtension") },
      maxAttachmentCount: { type: "integer", format: "int32", minimum: 0 },
    },
  },
  ConversationConfig: {
    type: "object",
    properties: { lastChatModelSpec: { oneOf: [ref("ChatModelSpec"), { type: "null" }] } },
  },
  ConversationSummary: {
    type: "object",
    required: ["conversationId"],
    properties: {
      conversationId: { type: "string" }, title: { type: ["string", "null"] }, status: { type: "string" },
      createdTime: { type: "string", format: "date-time" }, lastUpdateTime: { type: "string", format: "date-time" },
    },
    additionalProperties: true,
  },
  ConversationSummaryList: {
    type: "object", required: ["records"],
    properties: { records: { type: "array", items: ref("ConversationSummary") } },
  },
  ConversationStats: {
    type: "object",
    required: ["publishId", "totalConversations", "activeConversations", "totalMessages", "totalTokens", "avgMessagesPerConversation"],
    properties: {
      publishId: { type: "string" }, totalConversations: { type: "integer", format: "int64" },
      activeConversations: { type: "integer", format: "int64" }, totalMessages: { type: "integer", format: "int64" },
      totalTokens: { type: "integer", format: "int64" }, avgMessagesPerConversation: { type: "number", format: "double" },
    },
  },
  ConversationIds: {
    type: "object", required: ["conversationIds"],
    properties: { conversationIds: { type: "array", items: { type: "string" } } },
  },
  ConversationActivityBatchInput: {
    type: "object", required: ["conversationIds"],
    properties: { conversationIds: { type: "array", minItems: 1, maxItems: 1000, items: { type: "string", minLength: 1, maxLength: 64 } } },
  },
  ConversationActivity: {
    type: "object", required: ["conversationId", "hasUnreadCompletion"],
    properties: {
      conversationId: { type: "string" }, executionStatus: { type: ["string", "null"] },
      activeMessageId: { type: ["string", "null"] }, executionEpoch: { type: ["integer", "null"], format: "int64" },
      executionStartedTime: { type: ["string", "null"], format: "date-time" }, latestTerminalMessageId: { type: ["string", "null"] },
      latestTerminalTime: { type: ["string", "null"], format: "date-time" }, hasUnreadCompletion: { type: "boolean" },
    },
  },
  ConversationActivityList: {
    type: "object", required: ["records"], properties: { records: { type: "array", items: ref("ConversationActivity") } },
  },
  ConversationReadReceiptInput: {
    type: "object", required: ["messageId"], properties: { messageId: { type: "string", minLength: 1, maxLength: 64 } },
  },
  ConversationReadReceipt: { allOf: [ref("ConversationActivity")] },
  ConversationContextUsage: {
    type: "object",
    properties: {
      usedTokens: { type: "integer", format: "int64" }, maxTokens: { type: "integer", format: "int64" },
      usageRatio: { type: "number", format: "double" },
    }, additionalProperties: true,
  },
  ConversationTitle: {
    type: "object", required: ["title"],
    properties: { title: { type: "string" }, generating: { type: "boolean", default: false } }, additionalProperties: true,
  },
  ConversationTitleInput: {
    type: "object", required: ["title"], properties: { title: { type: "string", minLength: 1, maxLength: 255 } },
  },
  ConversationStatusInput: {
    type: "object", required: ["status"], properties: { status: { type: "string" } },
  },
  ConversationUserMessage: {
    type: "object", properties: { query: { type: "string" }, files: { type: "array", items: ref("AiChatFileRef") } }, additionalProperties: true,
  },
  ConversationMessage: {
    type: "object", required: ["messageId", "userMessage", "inputTokens", "outputTokens", "totalTokens", "status", "createdTime", "lastUpdateTime"],
    properties: {
      messageId: { type: "string" }, userMessage: ref("ConversationUserMessage"), inputTokens: { type: "integer", format: "int64" },
      outputTokens: { type: "integer", format: "int64" }, totalTokens: { type: "integer", format: "int64" },
      executionTimeMillis: { type: "integer", format: "int64" }, processingSteps: { type: "integer" }, totalToolCalls: { type: "integer" },
      status: { type: "string" }, createdTime: { type: "string", format: "date-time" }, lastUpdateTime: { type: "string", format: "date-time" },
      executionType: { type: "string" }, parentMessageId: { type: ["string", "null"] },
    }, additionalProperties: true,
  },
  ConversationMessagePage: {
    type: "object", required: ["records", "page"],
    properties: { records: { type: "array", items: ref("ConversationMessage") }, page: ref("PageInfo") },
  },
  AsyncTask: {
    type: "object", required: ["asyncTaskId", "status"],
    properties: { asyncTaskId: { type: "string" }, status: { type: "string" }, createdTime: { type: "string", format: "date-time" } },
    additionalProperties: true,
  },
  AsyncTaskPage: {
    type: "object", required: ["records", "page"], properties: { records: { type: "array", items: ref("AsyncTask") }, page: ref("PageInfo") },
  },
  AiChatEventsBatchInput: {
    type: "object", required: ["conversationId", "messageIds"],
    properties: { conversationId: { type: "string", minLength: 1 }, messageIds: { type: "array", minItems: 1, maxItems: 50, items: { type: "string", minLength: 1 } } },
  },
  ChatStreamProbeInput: {
    type: "object", required: ["probeId"], properties: { probeId: { type: "string", pattern: "^[A-Za-z0-9_-]{1,80}$" } },
  },
  ChatStreamProbeEvent: {
    type: "object", required: ["probeId", "sequence", "serverElapsedMs"],
    properties: { probeId: { type: "string" }, sequence: { type: "integer" }, serverElapsedMs: { type: "integer", format: "int64" } },
  },
  BaseAiChatBriefEvent: {
    type: "object", required: ["type"], properties: { type: { type: "string" } }, additionalProperties: true,
  },
  AiChatTextBriefEvent: {
    allOf: [ref("BaseAiChatBriefEvent"), { type: "object", required: ["message"], properties: { message: { type: "string" } } }],
  },
  AiChatErrorBriefEvent: {
    allOf: [ref("BaseAiChatBriefEvent"), { type: "object", required: ["message"], properties: { type: { const: "error" }, message: { type: "string" } } }],
  },
  AiChatUserQueryBriefEvent: {
    allOf: [ref("BaseAiChatBriefEvent"), { type: "object", required: ["query"], properties: { type: { const: "user-query" }, query: { type: "string" }, attachments: { type: ["array", "null"], items: { type: "object", additionalProperties: true } } } }],
  },
  AiChatToolExecutionBriefEvent: {
    allOf: [ref("BaseAiChatBriefEvent"), { type: "object", required: ["toolCallId", "toolName", "status"], properties: { type: { const: "tool-execution" }, toolCallId: { type: "string" }, toolName: { type: "string" }, status: { type: "string" }, action: { type: "string" }, summary: { type: ["string", "null"] }, extension: { type: ["object", "null"], additionalProperties: true } } }],
  },
  AiChatAwaitingInputBriefEvent: {
    allOf: [ref("BaseAiChatBriefEvent"), { type: "object", required: ["questionId", "conversationId", "messageId", "question", "options", "multiple", "timeoutSeconds"], properties: { type: { const: "tool-execution-awaiting-user-input" }, questionId: { type: "string" }, conversationId: { type: "string" }, messageId: { type: "string" }, question: { type: "string" }, questionDetails: { type: "string" }, options: { type: "array", items: { type: "string" } }, multiple: { type: "boolean" }, timeoutSeconds: { type: "integer" }, expiresAt: { type: ["string", "null"], format: "date-time" }, serverNow: { type: ["string", "null"], format: "date-time" } } }],
  },
  AiChatSubAgentCallBriefEvent: {
    allOf: [ref("BaseAiChatBriefEvent"), { type: "object", required: ["toolCallId", "toolName", "subAgentConversationId", "subAgentMessageId"], properties: { type: { const: "tool-execution-sub-agent-call" }, toolCallId: { type: "string" }, toolName: { type: "string" }, subAgentConversationId: { type: "string" }, subAgentMessageId: { type: "string" } } }],
  },
  AiChatCompactorWarningBriefEvent: {
    allOf: [ref("BaseAiChatBriefEvent"), { type: "object", required: ["level", "warning"], properties: { type: { const: "compactor-warning" }, level: { type: "string" }, warning: { type: "string" } } }],
  },
  AiChatEndBriefEvent: {
    allOf: [ref("BaseAiChatBriefEvent"), { type: "object", properties: { type: { const: "end" }, totalTokens: { type: "integer", format: "int64" }, artifacts: { type: "array", items: { type: "object", additionalProperties: true } }, nonFileArtifacts: { type: "array", items: { type: "object", additionalProperties: true } } }, additionalProperties: true }],
  },
  AiChatObjectBriefEvent: { allOf: [ref("BaseAiChatBriefEvent"), { type: "object", additionalProperties: true }] },
  AiChatBriefEvent: {
    oneOf: [ref("AiChatTextBriefEvent"), ref("AiChatErrorBriefEvent"), ref("AiChatUserQueryBriefEvent"), ref("AiChatToolExecutionBriefEvent"), ref("AiChatAwaitingInputBriefEvent"), ref("AiChatSubAgentCallBriefEvent"), ref("AiChatCompactorWarningBriefEvent"), ref("AiChatEndBriefEvent"), ref("AiChatObjectBriefEvent")],
    discriminator: {
      propertyName: "type",
      mapping: {
        message: "#/components/schemas/AiChatTextBriefEvent", think: "#/components/schemas/AiChatTextBriefEvent",
        error: "#/components/schemas/AiChatErrorBriefEvent", "user-query": "#/components/schemas/AiChatUserQueryBriefEvent",
        "tool-execution": "#/components/schemas/AiChatToolExecutionBriefEvent",
        "tool-execution-awaiting-user-input": "#/components/schemas/AiChatAwaitingInputBriefEvent",
        "tool-execution-sub-agent-call": "#/components/schemas/AiChatSubAgentCallBriefEvent",
        "compactor-warning": "#/components/schemas/AiChatCompactorWarningBriefEvent", end: "#/components/schemas/AiChatEndBriefEvent",
        start: "#/components/schemas/AiChatObjectBriefEvent", "manual-interrupt": "#/components/schemas/AiChatObjectBriefEvent",
        "compressor-context-start": "#/components/schemas/AiChatObjectBriefEvent", "compressor-context-end": "#/components/schemas/AiChatObjectBriefEvent",
        "chat-client-request": "#/components/schemas/AiChatObjectBriefEvent", "chat-client-response": "#/components/schemas/AiChatObjectBriefEvent",
      },
    },
  },
  AiChatBriefEventList: {
    type: "object", required: ["records"], properties: { records: { type: "array", items: ref("AiChatBriefEvent") } },
  },
  AiChatEventsBatch: {
    type: "object", properties: { messages: { type: "array", items: { type: "object", additionalProperties: true } }, skipped: { type: "array", items: { type: "object", additionalProperties: true } } }, additionalProperties: true,
  },
  ConversationShareInput: {
    type: "object", properties: { password: { type: ["string", "null"], pattern: "^[0-9]{6}$" }, expiresAt: { type: ["string", "null"], format: "date-time" } },
  },
  ConversationShare: {
    type: "object", required: ["shareId"], properties: { shareId: { type: "integer", format: "int64" }, url: { type: "string", format: "uri" }, expiresAt: { type: ["string", "null"], format: "date-time" } }, additionalProperties: true,
  },
  ConversationShareList: { type: "object", required: ["records"], properties: { records: { type: "array", items: ref("ConversationShare") } } },
  PlanApprovalInput: {
    type: "object", required: ["conversationId", "messageId", "approved"], properties: { conversationId: { type: "string" }, messageId: { type: "string" }, approved: { type: "boolean" }, feedback: { type: ["string", "null"] } },
  },
  OperationResult: { type: "object", required: ["success"], properties: { success: { type: "boolean" }, message: { type: ["string", "null"] } }, additionalProperties: true },
  PlanStatus: { type: "object", required: ["pending", "status"], properties: { pending: { type: "boolean" }, status: { type: "string" } } },
  UserInputStatus: { type: "object", required: ["pending"], properties: { pending: { type: "boolean" }, question: { type: ["string", "null"] }, questionDetails: { type: ["string", "null"] }, options: { type: ["array", "null"], items: { type: "string" } }, multiple: { type: ["boolean", "null"] } } },
  UserInputAnswerInput: { type: "object", required: ["conversationId", "messageId", "questionId", "selectedOptions"], properties: { conversationId: { type: "string" }, messageId: { type: "string" }, questionId: { type: "string" }, selectedOptions: { type: "array", items: { type: "string" } }, customInput: { type: ["string", "null"] } } },
  GeneratePreSignedUrlInput: {
    type: "object",
    required: ["fileName", "module", "contentMd5"],
    properties: {
      fileName: { type: "string", maxLength: 255 },
      module: {
        type: "string",
        pattern: "^ai-chat-attachments$",
        example: "ai-chat-attachments",
        description: "Registered file module for public Agent chat attachments.",
      },
      contentMd5: { type: "string", maxLength: 64 },
      fileId: { type: ["integer", "null"], format: "int64" },
      metadata: { type: ["object", "null"], additionalProperties: true },
    },
  },
  GeneratePreSignedUrlOutput: { type: "object", required: ["url"], properties: { url: { type: "string", format: "uri" }, fileUk: { type: ["string", "null"] }, headers: { type: "object", additionalProperties: { type: "string" } } }, additionalProperties: true },
  ConfirmUploadInput: { type: "object", required: ["fileUk", "contentMd5"], properties: { fileUk: { type: "string", maxLength: 128 }, contentMd5: { type: "string", maxLength: 64 } } },
  CreateFileInput: { type: "object", required: ["fileName", "contentMd5"], properties: { fileName: { type: "string", maxLength: 255 }, contentMd5: { type: "string", maxLength: 128 } } },
  AgentFile: { type: "object", required: ["id", "fileName"], properties: { id: { type: "integer", format: "int64" }, fileName: { type: "string" }, contentMd5: { type: ["string", "null"] }, size: { type: ["integer", "null"], format: "int64" }, contentType: { type: ["string", "null"] } }, additionalProperties: true },
  FileExists: { type: "object", required: ["exists"], properties: { exists: { type: "boolean" } } },
  PreSignedReadUrl: { type: "object", required: ["url"], properties: { url: { type: "string", format: "uri" }, expiresAt: { type: ["string", "null"], format: "date-time" } }, additionalProperties: true },
  ReturnedReference: { type: "object", required: ["citationType", "referenceId"], properties: { citationType: { type: "string" }, referenceId: { type: "integer", format: "int64" } } },
  CitationMetadata: { type: "object", required: ["citationType", "referenceId"], properties: { citationType: { type: "string" }, referenceId: { type: "integer", format: "int64" }, title: { type: ["string", "null"] }, content: { type: ["string", "null"] } }, additionalProperties: true },
  CitationMetadataList: { type: "object", required: ["records"], properties: { records: { type: "array", items: ref("CitationMetadata") } } },
  WorkspaceArtifactList: { type: "object", properties: { files: { type: "array", items: ref("AgentFile") }, nonFileArtifacts: { type: "array", items: { type: "object", additionalProperties: true } } }, additionalProperties: true },
  SqlQueryResultPage: { type: "object", properties: { columns: { type: "array", items: { type: "object", additionalProperties: true } }, records: { type: "array", items: { type: "array", items: {} } }, page: ref("PageInfo") }, additionalProperties: true },
  SqlChartDataset: { type: "object", additionalProperties: true },
};

const nullable = (schema) => ({ oneOf: [schema, { type: "null" }] });
const stringEnum = (...values) => ({ type: "string", enum: values });
const arrayOf = (schema) => ({ type: "array", items: schema });
const objectOf = (required, properties) => ({
  type: "object",
  additionalProperties: false,
  required,
  properties,
});

// These overrides mirror the concrete DTOs returned by AbstractAgentsController.
// Keeping them beside the contract generator makes an untyped fallback visible in review.
Object.assign(schemas, {
  ConversationActivity: objectOf(["conversationId", "executionStatus", "hasUnreadCompletion", "requiresUserConfirmation"], {
    conversationId: { type: "string" }, executionStatus: { type: "string" }, activeMessageId: nullable({ type: "string" }),
    executionEpoch: nullable({ type: "string" }), executionStartedTime: nullable({ type: "string", format: "date-time" }),
    latestTerminalMessageId: nullable({ type: "string" }), latestTerminalTime: nullable({ type: "string", format: "date-time" }),
    hasUnreadCompletion: { type: "boolean" }, requiresUserConfirmation: { type: "boolean" },
  }),
  ConversationReadReceipt: objectOf(["conversationId", "executionStatus", "hasUnreadCompletion"], {
    conversationId: { type: "string" }, executionStatus: { type: "string" }, activeMessageId: nullable({ type: "string" }),
    executionEpoch: nullable({ type: "string" }), executionStartedTime: nullable({ type: "string", format: "date-time" }),
    latestTerminalMessageId: nullable({ type: "string" }), latestTerminalTime: nullable({ type: "string", format: "date-time" }),
    hasUnreadCompletion: { type: "boolean" },
  }),
  ChatModelSpec: objectOf(["keyGroupId", "model"], {
    keyGroupId: { type: "integer", format: "int64", minimum: 1 },
    model: { type: "string", minLength: 1 },
    thinking: nullable({ type: "boolean" }),
    stopSequences: nullable(arrayOf({ type: "string" })),
    temperature: nullable({ type: "number", format: "double", minimum: 0, maximum: 2 }),
    maxTokens: nullable({ type: "integer", format: "int32", minimum: 1 }),
    topP: nullable({ type: "number", format: "double", minimum: 0, maximum: 1 }),
    topK: nullable({ type: "integer", format: "int32", minimum: 1 }),
    frequencyPenalty: nullable({ type: "number", format: "double", minimum: -2, maximum: 2 }),
    presencePenalty: nullable({ type: "number", format: "double", minimum: -2, maximum: 2 }),
  }),
  AiChatFileRef: objectOf(["id"], {
    id: { type: "integer", format: "int64" },
    fileName: nullable({ type: "string" }),
  }),
  ConversationSummary: objectOf(
    ["conversationId", "conversationType", "titleState", "status", "messageCount", "totalTokens", "totalInputTokens", "totalOutputTokens", "usage", "createdTime", "lastUpdateTime"],
    {
      conversationId: { type: "string" },
      conversationType: { type: "string" },
      title: nullable({ type: "string" }),
      titleState: { type: "string" },
      status: { type: "string" },
      messageCount: { type: "integer", format: "int64", minimum: 0 },
      totalTokens: { type: "integer", format: "int64", minimum: 0 },
      totalInputTokens: { type: "integer", format: "int64", minimum: 0 },
      totalOutputTokens: { type: "integer", format: "int64", minimum: 0 },
      usage: ref("Usage"),
      createdTime: { type: "string", format: "date-time" },
      lastUpdateTime: { type: "string", format: "date-time" },
    },
  ),
  ConversationContextUsage: objectOf(
    ["systemPromptTokens", "sessionMessageTokens", "maxContextTokens", "toolDefinitionTokens", "protocolReserveTokens", "activeContextTokens", "requestedOutputTokens", "messageAssemblyReserveTokens", "requiredContextTokens", "calculationSource"],
    {
      systemPromptTokens: { type: "integer", format: "int32", minimum: 0 },
      sessionMessageTokens: { type: "integer", format: "int32", minimum: 0 },
      maxContextTokens: { type: "integer", format: "int32", minimum: 0 },
      toolDefinitionTokens: { type: "integer", format: "int32", minimum: 0 },
      protocolReserveTokens: { type: "integer", format: "int32", minimum: 0 },
      activeContextTokens: { type: "integer", format: "int64", minimum: 0 },
      requestedOutputTokens: { type: "integer", format: "int32", minimum: 0 },
      messageAssemblyReserveTokens: { type: "integer", format: "int32", minimum: 0 },
      requiredContextTokens: { type: "integer", format: "int64", minimum: 0 },
      activeUsageRatio: nullable({ type: "number", format: "double" }),
      requiredUsageRatio: nullable({ type: "number", format: "double" }),
      calculationSource: { type: "string" },
    },
  ),
  ConversationTitle: objectOf(["conversationId", "titleState"], {
    conversationId: { type: "string" },
    title: nullable({ type: "string" }),
    titleState: { type: "string" },
  }),
  InputTokenBreakdown: objectOf(["observedInputTokens", "uncachedInputTokens", "cachedInputTokens"], {
    observedInputTokens: { type: "integer", format: "int64", minimum: 0 },
    uncachedInputTokens: { type: "integer", format: "int64", minimum: 0 },
    cachedInputTokens: { type: "integer", format: "int64", minimum: 0 },
    cacheCreationInputTokens: nullable({ type: "integer", format: "int64", minimum: 0 }),
  }),
  Usage: objectOf(["inputTokens", "outputTokens", "totalTokens"], {
    inputTokens: { type: "integer", format: "int64", minimum: 0 },
    outputTokens: { type: "integer", format: "int64", minimum: 0 },
    totalTokens: { type: "integer", format: "int64", minimum: 0, readOnly: true },
    inputTokenBreakdown: nullable(ref("InputTokenBreakdown")),
    reasoningTokens: nullable({ type: "integer", format: "int64", minimum: 0 }),
    cacheHitRate: nullable({ type: "number", format: "double", readOnly: true }),
    inputBreakdownCoverageRate: nullable({ type: "number", format: "double", readOnly: true }),
  }),
  MediaAttachment: objectOf(["fileId", "path", "fileSize", "fileName", "mimeType"], {
    fileId: { type: "integer", format: "int64" },
    path: { type: "string" },
    fileSize: { type: "integer", format: "int64", minimum: 0 },
    fileName: { type: "string" },
    mimeType: { type: "string" },
  }),
  MultimodalMediaAttachment: objectOf(["fileName", "mimeType", "data"], {
    fileName: { type: "string" },
    mimeType: { type: "string" },
    data: { type: "string" },
  }),
  ConversationUserMessage: objectOf(["text", "executionType", "type"], {
    text: { type: "string" },
    multimodalAttachments: nullable(arrayOf(ref("MultimodalMediaAttachment"))),
    attachments: nullable(arrayOf(ref("MediaAttachment"))),
    metadataRawJson: nullable({ type: "string", contentMediaType: "application/json" }),
    executionType: { type: "string" },
    type: { type: "string", const: "USER" },
  }),
  ConversationMessage: objectOf(
    ["messageId", "userMessage", "inputTokens", "outputTokens", "totalTokens", "usage", "executionTimeMillis", "processingSteps", "totalToolCalls", "status", "createdTime", "lastUpdateTime", "executionType"],
    {
      messageId: { type: "string" }, userMessage: ref("ConversationUserMessage"),
      inputTokens: { type: "integer", format: "int64", minimum: 0 }, outputTokens: { type: "integer", format: "int64", minimum: 0 },
      totalTokens: { type: "integer", format: "int64", minimum: 0 }, usage: ref("Usage"),
      executionTimeMillis: { type: "integer", format: "int64", minimum: 0 }, processingSteps: { type: "integer", format: "int32", minimum: 0 },
      totalToolCalls: { type: "integer", format: "int32", minimum: 0 }, status: { type: "string" },
      createdTime: { type: "string", format: "date-time" }, lastUpdateTime: { type: "string", format: "date-time" },
      executionType: { type: "string" }, parentMessageId: nullable({ type: "string" }),
    },
  ),
  AsyncTask: objectOf(
    ["taskId", "taskType", "title", "status", "resultAvailable", "cancellable", "originConversationId", "originMessageId", "originToolId", "originToolName", "targetMessageId", "notificationStatus", "createdTime", "lastUpdateTime", "trackingStatus"],
    {
      taskId: { type: "string" }, taskType: { type: "string" }, title: { type: "string" }, status: { type: "string" },
      progressPercent: nullable({ type: "integer", format: "int32", minimum: 0, maximum: 100 }), phase: nullable({ type: "string" }),
      statusMessage: nullable({ type: "string" }), resultAvailable: { type: "boolean" }, cancellable: { type: "boolean" },
      failureCode: nullable({ type: "string" }), failureMessage: nullable({ type: "string" }), originConversationId: { type: "string" },
      originMessageId: { type: "string" }, originToolId: { type: "string" }, originToolName: { type: "string" }, targetMessageId: { type: "string" },
      notificationStatus: { type: "string" }, notificationMessageId: nullable({ type: "string" }), createdTime: { type: "string", format: "date-time" },
      startedTime: nullable({ type: "string", format: "date-time" }), completedTime: nullable({ type: "string", format: "date-time" }),
      lastUpdateTime: { type: "string", format: "date-time" }, trackingStatus: { type: "string" },
      trackingFailureCode: nullable({ type: "string" }), lastPollError: nullable({ type: "string" }),
    },
  ),
  GeneratePreSignedUrlInput: objectOf(["fileName", "module", "contentMd5"], {
    fileName: { type: "string", maxLength: 255 }, module: { type: "string", const: "ai-chat-attachments" },
    contentMd5: { type: "string", maxLength: 64 }, fileId: nullable({ type: "integer", format: "int64" }),
  }),
  GeneratePreSignedUrlOutput: objectOf(["support"], {
    support: { type: "boolean" }, fileUk: nullable({ type: "string" }), url: nullable({ type: "string", format: "uri" }),
  }),
  AgentFile: objectOf(["id", "fileName", "contentMd5", "size", "createdTime", "lastUpdateTime"], {
    id: { type: "integer", format: "int64" }, fileName: { type: "string" }, contentMd5: { type: "string" },
    size: { type: "integer", format: "int64", minimum: 0 }, createdTime: { type: "string", format: "date-time" },
    lastUpdateTime: { type: "string", format: "date-time" },
  }),
  PreSignedReadUrl: objectOf(["url"], { url: { type: "string", format: "uri" } }),
  ReturnedReference: objectOf(["type", "referenceId"], { type: { type: "string" }, referenceId: { type: "integer", format: "int64" } }),
  CitationMetadata: objectOf(["type", "referenceId"], {
    type: { type: "string" }, referenceId: { type: "integer", format: "int64" },
    title: nullable({ type: "string" }), description: nullable({ type: "string" }),
  }),
  WorkspaceFile: objectOf(["relativePath", "size", "fileName", "mimeType", "lastUpdateTime"], {
    relativePath: { type: "string" }, size: { type: "integer", format: "int64", minimum: 0 }, fileName: { type: "string" },
    mimeType: { type: "string" }, lastUpdateTime: { type: "string", format: "date-time" },
  }),
  WorkspaceNonFileArtifact: objectOf(["artifactId", "kind", "title", "lastUpdateTime"], {
    artifactId: { type: "string" }, kind: { type: "string" }, title: { type: "string" }, description: nullable({ type: "string" }),
    lastUpdateTime: { type: "string", format: "date-time" }, previewUrl: nullable({ type: "string", format: "uri" }),
  }),
  WorkspaceFilePage: objectOf(["records", "page"], { records: arrayOf(ref("WorkspaceFile")), page: ref("PageInfo") }),
  WorkspaceArtifactList: objectOf(["fileArtifacts", "nonFileArtifacts"], {
    fileArtifacts: ref("WorkspaceFilePage"), nonFileArtifacts: arrayOf(ref("WorkspaceNonFileArtifact")),
  }),
  SqlResultColumnSchema: objectOf(["name", "type", "nullable"], {
    name: { type: "string" }, type: { type: "string" }, nullable: { type: "boolean" },
    precision: nullable({ type: "integer", format: "int32" }), scale: nullable({ type: "integer", format: "int32" }),
  }),
  SqlQueryResultRow: objectOf(["values"], { values: arrayOf(nullable({ type: "string" })) }),
  SqlQueryResultPage: objectOf(["resultId", "sql", "columns", "rowCount", "columnCount", "current", "size", "total", "records"], {
    resultId: { type: "string" }, sql: { type: "string" }, columns: arrayOf({ type: "string" }), rowCount: { type: "integer", format: "int64" },
    columnCount: { type: "integer", format: "int32" }, current: { type: "integer", format: "int32" }, size: { type: "integer", format: "int32" },
    total: { type: "integer", format: "int64" }, records: arrayOf(ref("SqlQueryResultRow")),
  }),
});

const chartColumn = (name, type, valueSchema) => objectOf(["name", "type", "values"], {
  name: { type: "string" }, type: { type: "string", enum: Array.isArray(type) ? type : [type] }, values: arrayOf(nullable(valueSchema)),
});
Object.assign(schemas, {
  StringChartColumn: chartColumn("StringChartColumn", "STRING", { type: "string" }),
  IntegerChartColumn: chartColumn("IntegerChartColumn", ["INTEGER", "LONG"], { type: "integer", format: "int64" }),
  DecimalChartColumn: chartColumn("DecimalChartColumn", "DECIMAL", { type: "string" }),
  DoubleChartColumn: chartColumn("DoubleChartColumn", "DOUBLE", { type: "number", format: "double" }),
  BooleanChartColumn: chartColumn("BooleanChartColumn", "BOOLEAN", { type: "boolean" }),
  LocalDateChartColumn: chartColumn("LocalDateChartColumn", "LOCAL_DATE", { type: "string", format: "date" }),
  LocalDateTimeChartColumn: chartColumn("LocalDateTimeChartColumn", "LOCAL_DATE_TIME", { type: "string", format: "local-date-time" }),
  LocalTimeChartColumn: chartColumn("LocalTimeChartColumn", "LOCAL_TIME", { type: "string", format: "time" }),
  InstantChartColumn: chartColumn("InstantChartColumn", "INSTANT", { type: "string", format: "date-time" }),
  ChartColumnData: {
    oneOf: ["String", "Integer", "Decimal", "Double", "Boolean", "LocalDate", "LocalDateTime", "LocalTime", "Instant"].map((kind) => ref(`${kind}ChartColumn`)),
    discriminator: { propertyName: "type", mapping: {
      STRING: "#/components/schemas/StringChartColumn", INTEGER: "#/components/schemas/IntegerChartColumn", LONG: "#/components/schemas/IntegerChartColumn",
      DECIMAL: "#/components/schemas/DecimalChartColumn", DOUBLE: "#/components/schemas/DoubleChartColumn", BOOLEAN: "#/components/schemas/BooleanChartColumn",
      LOCAL_DATE: "#/components/schemas/LocalDateChartColumn", LOCAL_DATE_TIME: "#/components/schemas/LocalDateTimeChartColumn",
      LOCAL_TIME: "#/components/schemas/LocalTimeChartColumn", INSTANT: "#/components/schemas/InstantChartColumn",
    } },
  },
  SqlChartDataset: objectOf(["resultId", "schema", "rowCount", "columns"], {
    resultId: { type: "string" }, schema: arrayOf(ref("SqlResultColumnSchema")), rowCount: { type: "integer", format: "int64" },
    columns: arrayOf(ref("ChartColumnData")),
  }),
});

const discriminatedObject = (propertyName, propertyValue, required, properties) => objectOf(
  [propertyName, ...required],
  { [propertyName]: { type: "string", const: propertyValue }, ...properties },
);
const messageMetadata = { metadataRawJson: nullable({ type: "string", contentMediaType: "application/json" }) };
Object.assign(schemas, {
  ToolCall: objectOf(["id", "type", "name", "arguments"], {
    id: { type: "string" }, type: { type: "string" }, name: { type: "string" }, arguments: { type: "string", contentMediaType: "application/json" },
  }),
  ToolResponse: objectOf(["id", "name", "status", "responseData", "metadataRawJson"], {
    id: { type: "string" }, name: { type: "string" }, status: { type: "string" }, responseData: { type: "string" },
    metadataRawJson: { type: "string", contentMediaType: "application/json" },
  }),
  SystemChatMessage: discriminatedObject("type", "SYSTEM", ["text"], { text: { type: "string" }, ...messageMetadata }),
  UserChatMessage: discriminatedObject("type", "USER", ["text"], {
    text: { type: "string" }, multimodalAttachments: nullable(arrayOf(ref("MultimodalMediaAttachment"))),
    attachments: nullable(arrayOf(ref("MediaAttachment"))), ...messageMetadata,
  }),
  AssistantChatMessage: discriminatedObject("type", "ASSISTANT", ["toolCalls"], {
    text: nullable({ type: "string" }), reasoningText: nullable({ type: "string" }), toolCalls: arrayOf(ref("ToolCall")), ...messageMetadata,
  }),
  ToolResponseChatMessage: discriminatedObject("type", "TOOL", ["responses"], { responses: arrayOf(ref("ToolResponse")), ...messageMetadata }),
  ChatMessage: {
    oneOf: [ref("SystemChatMessage"), ref("UserChatMessage"), ref("AssistantChatMessage"), ref("ToolResponseChatMessage")],
    discriminator: { propertyName: "type", mapping: {
      SYSTEM: "#/components/schemas/SystemChatMessage", USER: "#/components/schemas/UserChatMessage",
      ASSISTANT: "#/components/schemas/AssistantChatMessage", TOOL: "#/components/schemas/ToolResponseChatMessage",
    } },
  },
  ChatOptions: objectOf([], {
    model: nullable({ type: "string" }), frequencyPenalty: nullable({ type: "number", format: "double" }),
    maxTokens: nullable({ type: "integer", format: "int32" }), presencePenalty: nullable({ type: "number", format: "double" }),
    stopSequences: nullable(arrayOf({ type: "string" })), temperature: nullable({ type: "number", format: "double" }),
    topP: nullable({ type: "number", format: "double" }),
  }),
  ArtifactInfo: objectOf(["fileId", "fileSize", "fileName", "mimeType", "deliveryStatus", "issueCodes", "recoverable"], {
    fileId: { type: "integer", format: "int64" }, fileSize: { type: "integer", format: "int64", minimum: 0 }, fileName: { type: "string" },
    mimeType: { type: "string" }, relativePath: nullable({ type: "string" }), deliveryStatus: { type: "string" },
    issueCodes: arrayOf({ type: "string" }), recoverable: { type: "boolean" },
  }),
  AskUserQuestionOption: objectOf(["text", "recommended"], { text: { type: "string" }, recommended: { type: "boolean" } }),
  AiChatUserQueryBriefEvent: discriminatedObject("type", "user-query", ["query"], {
    query: { type: "string" }, attachments: nullable(arrayOf(ref("MediaAttachment"))),
  }),
  AiChatCompressorContextStartBriefEvent: discriminatedObject("type", "compressor-context-start", [], {}),
  AiChatCompressorContextEndBriefEvent: discriminatedObject("type", "compressor-context-end", [], {}),
  AiChatCompactorWarningBriefEvent: discriminatedObject("type", "compactor-warning", ["level", "warning"], {
    level: { type: "string" }, warning: { type: "string" },
  }),
  AiChatManualInterruptBriefEvent: discriminatedObject("type", "manual-interrupt", [], {}),
  AiChatErrorBriefEvent: discriminatedObject("type", "error", ["message"], { message: { type: "string" } }),
  AiChatStartBriefEvent: discriminatedObject("type", "start", [], {}),
  AiChatThinkBriefEvent: discriminatedObject("type", "think", ["message"], { message: { type: "string" } }),
  AiChatRequestBriefEvent: discriminatedObject("type", "chat-client-request", ["messages"], {
    messages: arrayOf(ref("ChatMessage")), chatOptions: nullable(ref("ChatOptions")),
  }),
  AiChatResponseBriefEvent: discriminatedObject("type", "chat-client-response", ["assistantMessages", "usage"], {
    assistantMessages: arrayOf(ref("AssistantChatMessage")), usage: ref("Usage"),
  }),
  AiChatMessageBriefEvent: discriminatedObject("type", "message", ["message"], { message: { type: "string" } }),
  AiChatToolExecutionBriefEvent: discriminatedObject("type", "tool-execution", ["toolId", "toolName", "status", "action"], {
    toolId: { type: "string" }, toolName: { type: "string" }, status: { type: "string" }, action: { type: "string" },
    summary: nullable({ type: "string" }), extension: nullable(ref("ToolExtension")),
  }),
  AiChatSubAgentCallBriefEvent: discriminatedObject("type", "tool-execution-sub-agent-call", ["toolCallId", "toolName", "subAgentConversationId", "subAgentMessageId"], {
    toolCallId: { type: "string" }, toolName: { type: "string" }, subAgentConversationId: { type: "string" }, subAgentMessageId: { type: "string" },
  }),
  AiChatAwaitingInputBriefEvent: discriminatedObject("type", "tool-execution-awaiting-user-input", ["toolCallId", "toolName", "questionId", "question", "options", "multiple", "serverNow", "timeoutSeconds"], {
    toolCallId: { type: "string" }, toolName: { type: "string" }, questionId: { type: "string" }, question: { type: "string" },
    options: arrayOf(ref("AskUserQuestionOption")), multiple: { type: "boolean" }, serverNow: { type: "string", format: "date-time" },
    timeoutSeconds: { type: "integer", format: "int64", minimum: 1 }, questionDetails: nullable({ type: "string" }),
  }),
  AiChatEndBriefEvent: discriminatedObject("type", "end", ["executionTimeMillis", "totalUsage", "artifacts", "nonFileArtifacts"], {
    executionTimeMillis: { type: "integer", format: "int64", minimum: 0 }, totalUsage: ref("Usage"),
    messageContextUsageRatio: nullable({ type: "number", format: "double" }), contextWindowUsage: nullable(ref("ConversationContextUsage")),
    artifacts: arrayOf(ref("ArtifactInfo")), nonFileArtifacts: arrayOf(ref("WorkspaceNonFileArtifact")),
  }),
  UnknownAiChatBriefEvent: objectOf(["type", "rawJson"], {
    type: { type: "string" }, rawJson: { type: "string", contentMediaType: "application/json" },
  }),
});

const eventKinds = [
  ["user-query", "AiChatUserQueryBriefEvent"], ["compressor-context-start", "AiChatCompressorContextStartBriefEvent"],
  ["compressor-context-end", "AiChatCompressorContextEndBriefEvent"], ["compactor-warning", "AiChatCompactorWarningBriefEvent"],
  ["manual-interrupt", "AiChatManualInterruptBriefEvent"], ["error", "AiChatErrorBriefEvent"], ["start", "AiChatStartBriefEvent"],
  ["think", "AiChatThinkBriefEvent"], ["chat-client-request", "AiChatRequestBriefEvent"], ["chat-client-response", "AiChatResponseBriefEvent"],
  ["message", "AiChatMessageBriefEvent"], ["tool-execution", "AiChatToolExecutionBriefEvent"],
  ["tool-execution-sub-agent-call", "AiChatSubAgentCallBriefEvent"],
  ["tool-execution-awaiting-user-input", "AiChatAwaitingInputBriefEvent"], ["end", "AiChatEndBriefEvent"],
];
schemas.AiChatBriefEvent = {
  oneOf: [...eventKinds.map(([, name]) => ref(name)), ref("UnknownAiChatBriefEvent")],
  discriminator: {
    propertyName: "type",
    mapping: Object.fromEntries(eventKinds.map(([type, name]) => [type, `#/components/schemas/${name}`])),
  },
};

const extensionContent = {
  PlanApprovalExtensionContent: objectOf(["previewFileId", "serverNow", "approvalTimeoutAt"], {
    previewFileId: { type: "integer", format: "int64" }, serverNow: { type: "string", format: "date-time" }, approvalTimeoutAt: { type: "string", format: "date-time" },
  }),
  AskUserQuestionExtensionContent: objectOf(["selectedOptions"], {
    selectedOptions: arrayOf({ type: "string" }), customInput: nullable({ type: "string" }),
  }),
  ImageGenerationExtensionContent: objectOf(["fileId"], { fileId: { type: "integer", format: "int64" } }),
  SqlQueryExtensionContent: objectOf(["sql"], { sql: { type: "string" } }),
  SqlQueryResultExtensionContent: objectOf(["resultId", "rowCount", "totalRowCount", "columnCount", "columns", "schema", "truncated", "limit"], {
    resultId: { type: "string" }, rowCount: { type: "integer", format: "int64" }, totalRowCount: { type: "integer", format: "int64" },
    columnCount: { type: "integer", format: "int32" }, columns: arrayOf({ type: "string" }), schema: arrayOf(ref("SqlResultColumnSchema")),
    truncated: { type: "boolean" }, limit: { type: "integer", format: "int32" },
  }),
  ChartNumberFormat: objectOf(["type", "decimalPlaces"], {
    type: { type: "string" }, currency: nullable({ type: "string" }), decimalPlaces: { type: "integer", format: "int32" }, valueScale: nullable({ type: "string" }),
  }),
  ChartSeries: objectOf(["name", "valueColumn", "renderType", "axis", "numberFormat"], {
    name: { type: "string" }, valueColumn: { type: "string" }, renderType: stringEnum("BAR", "LINE", "PIE"),
    axis: stringEnum("PRIMARY", "SECONDARY"), numberFormat: ref("ChartNumberFormat"), stack: nullable({ type: "string" }),
  }),
  ChartSpec: objectOf(["version", "type", "title", "categoryColumn", "categoryType", "orientation", "series", "legend", "dataZoom", "nullPolicy"], {
    version: { type: "integer", format: "int32" }, type: stringEnum("BAR", "LINE", "BAR_LINE", "STACKED_BAR", "PIE"), title: { type: "string" },
    subtitle: nullable({ type: "string" }), categoryColumn: { type: "string" }, categoryType: stringEnum("CATEGORY", "TIME"),
    orientation: stringEnum("VERTICAL", "HORIZONTAL"), series: arrayOf(ref("ChartSeries")), legend: { type: "boolean" },
    dataZoom: stringEnum("NONE", "AUTO"), nullPolicy: stringEnum("GAP", "ZERO", "REJECT"),
  }),
  ChartQualitySummary: objectOf(["nullValueCount", "nullValueColumns", "zeroFilledValueCount"], {
    nullValueCount: { type: "integer", format: "int64" }, nullValueColumns: arrayOf({ type: "string" }), zeroFilledValueCount: { type: "integer", format: "int64" },
  }),
  ChartTimeContext: objectOf(["asOfInstant", "tenantZoneId"], {
    asOfInstant: { type: "string", format: "date-time" }, tenantZoneId: { type: "string" },
  }),
  SqlChartResultExtensionContent: objectOf(["resultId", "rowCount", "columnCount", "columns", "schema", "chart", "qualitySummary", "timeContext"], {
    resultId: { type: "string" }, rowCount: { type: "integer", format: "int64" }, columnCount: { type: "integer", format: "int32" },
    columns: arrayOf({ type: "string" }), schema: arrayOf(ref("SqlResultColumnSchema")), chart: ref("ChartSpec"),
    qualitySummary: ref("ChartQualitySummary"), timeContext: ref("ChartTimeContext"),
  }),
  VariableBinding: objectOf(["name", "value"], { name: { type: "string" }, value: { type: "string" } }),
  MathFormulaExtensionContent: objectOf(["expression"], { expression: { type: "string" }, variables: nullable(arrayOf(ref("VariableBinding"))) }),
  MathResultExtensionContent: objectOf(["result"], { result: { type: "string" } }),
  JsRunScriptExtensionContent: objectOf(["script"], { script: { type: "string" } }),
  JsRunScriptResultExtensionContent: objectOf(["stdout"], { result: nullable({ type: "string" }), stdout: { type: "string" } }),
  SkillResourceExtensionContent: objectOf(["operationType", "filepath"], { operationType: { type: "string" }, filepath: { type: "string" } }),
  TaskSummary: objectOf(["id", "subject", "status", "blocks", "blockedBy"], {
    id: { type: "string" }, subject: { type: "string" }, activeForm: nullable({ type: "string" }), status: { type: "string" },
    blocks: arrayOf({ type: "string" }), blockedBy: arrayOf({ type: "string" }),
  }),
  TaskProgressExtensionContent: objectOf(["action", "archived", "total", "pending", "inProgress", "completed", "progressPercent", "tasks"], {
    action: { type: "string" }, currentTaskId: nullable({ type: "string" }), currentTaskStatus: nullable({ type: "string" }), archived: { type: "boolean" },
    total: { type: "integer", format: "int32" }, pending: { type: "integer", format: "int32" }, inProgress: { type: "integer", format: "int32" },
    completed: { type: "integer", format: "int32" }, progressPercent: { type: "integer", format: "int32" }, tasks: arrayOf(ref("TaskSummary")),
  }),
};
Object.assign(schemas, extensionContent);

const extensionKinds = [
  ["planApproval", "PlanApprovalExtensionContent"], ["askUserQuestion", "AskUserQuestionExtensionContent"],
  ["imageGeneration", "ImageGenerationExtensionContent"], ["sqlQuery", "SqlQueryExtensionContent"],
  ["sqlQueryResult", "SqlQueryResultExtensionContent"], ["sqlChartResult", "SqlChartResultExtensionContent"],
  ["mathFormula", "MathFormulaExtensionContent"], ["mathResult", "MathResultExtensionContent"],
  ["jsRunScript", "JsRunScriptExtensionContent"], ["jsRunScriptResult", "JsRunScriptResultExtensionContent"],
  ["skillResource", "SkillResourceExtensionContent"], ["taskProgress", "TaskProgressExtensionContent"],
];
for (const [category, content] of extensionKinds) {
  schemas[`${content.replace("Content", "")}ToolExtension`] = discriminatedObject("category", category, ["content", "specialRender"], {
    content: ref(content), specialRender: { type: "boolean" },
  });
}
schemas.UnknownToolExtension = objectOf(["category", "rawJson"], {
  category: { type: "string" }, rawJson: { type: "string", contentMediaType: "application/json" },
});
schemas.ToolExtension = {
  oneOf: [...extensionKinds.map(([, content]) => ref(`${content.replace("Content", "")}ToolExtension`)), ref("UnknownToolExtension")],
  discriminator: {
    propertyName: "category",
    mapping: Object.fromEntries(extensionKinds.map(([category, content]) => [category, `#/components/schemas/${content.replace("Content", "")}ToolExtension`])),
  },
};

Object.assign(schemas, {
  AiChatMessageEvent: objectOf(["messageId", "events"], { messageId: { type: "string" }, events: arrayOf(ref("AiChatBriefEvent")) }),
  AiChatEventsBatchSkipped: objectOf(["messageId", "reason"], { messageId: { type: "string" }, reason: { type: "string" } }),
  AiChatEventsBatch: objectOf(["records", "skipped"], {
    records: arrayOf(ref("AiChatMessageEvent")), skipped: arrayOf(ref("AiChatEventsBatchSkipped")),
  }),
  ConversationShareCreated: objectOf(["shareId", "shareCode", "serverName", "passwordRequired"], {
    shareId: { type: "integer", format: "int64" }, shareCode: { type: "string" }, serverName: { type: "string" },
    passwordRequired: { type: "boolean" }, expiresAt: nullable({ type: "string", format: "date-time" }),
  }),
  ConversationShareRecord: objectOf(["shareId", "shareCode", "serverName", "accessMode", "status", "createdTime", "lastUpdateTime"], {
    shareId: { type: "integer", format: "int64" }, shareCode: { type: "string" }, serverName: { type: "string" }, accessMode: { type: "string" },
    status: { type: "string" }, expiresAt: nullable({ type: "string", format: "date-time" }), createdTime: { type: "string", format: "date-time" },
    lastUpdateTime: { type: "string", format: "date-time" },
  }),
  ConversationShareRevoked: objectOf(["shareId"], { shareId: { type: "integer", format: "int64" } }),
  ConversationShareList: objectOf(["records"], { records: arrayOf(ref("ConversationShareRecord")) }),
  OperationResult: objectOf(["success"], { success: { type: "boolean" }, message: nullable({ type: "string" }) }),
});

for (const obsolete of [
  "BaseAiChatBriefEvent", "AiChatTextBriefEvent", "AiChatObjectBriefEvent", "ConversationShare",
]) delete schemas[obsolete];

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Lingya Agents OpenAPI",
    version: "0.1.2",
    description: "Public, tenant-scoped Agent channel API authenticated with OPENAPI-HMAC-SHA256-V1. Studio administration endpoints are not part of this contract.",
    license: { name: "MIT", identifier: "MIT" },
  },
  servers: [{ url: "https://{tenantHost}", variables: { tenantHost: { default: "tenant.example.com", description: "Tenant host routed by the Lingya gateway." } } }],
  tags: ["Configuration", "Chat", "Conversations", "Messages", "Events", "Interactions", "Files", "Knowledge", "Workspace", "SQL"].map((name) => ({ name, description: `${name} operations exposed to signed OpenAPI clients.` })),
  security: [{ OpenApiAccessKey: [], OpenApiTimestamp: [], OpenApiNonce: [], OpenApiUser: [], OpenApiSignature: [] }],
  paths: {},
  components: {
    securitySchemes: {
      OpenApiAccessKey: { type: "apiKey", in: "header", name: "X-OpenAPI-AK", description: "32-character access key." },
      OpenApiTimestamp: { type: "apiKey", in: "header", name: "X-OpenAPI-Timestamp", description: "Unix epoch seconds within ±300 seconds of server time." },
      OpenApiNonce: { type: "apiKey", in: "header", name: "X-OpenAPI-Nonce", description: "Unpadded Base64URL encoding of 16-64 cryptographically random bytes. A nonce can be used only once." },
      OpenApiUser: { type: "apiKey", in: "header", name: "X-OpenAPI-User", description: "Unpadded Base64URL encoding of the 1-256 byte UTF-8 external user identifier." },
      OpenApiSignature: { type: "apiKey", in: "header", name: "X-OpenAPI-Signature", description: "Lowercase hexadecimal HMAC-SHA256 signature. The secret is never sent." },
    },
    responses: {
      Error: jsonResponse("API error", ref("CodeMessage")),
      ValidationError: jsonResponse("Validation error", ref("ValidationError")),
    },
    schemas,
  },
  "x-lingya-hmac": {
    algorithm: "HMAC-SHA256",
    version: "OPENAPI-HMAC-SHA256-V1",
    canonicalFields: ["version", "accessKey", "timestamp", "nonce", "method", "rawPath", "rawQuery", "encodedUser", "contentType", "sha256(body)"],
    separator: "\\n",
    signatureEncoding: "lowercase-hex",
    notes: ["Build the final request URI and body bytes before signing.", "Do not re-encode the path, query, JSON, or Content-Type after signing.", "Content-Encoding is not supported. Request bodies are limited to 2 MiB."],
  },
};

const prefix = "/api/agents/channel/openapi/v1/{channelId}/chat";
function add(method, suffix, operationId, tag, responseStatus, responseSchema, options = {}) {
  const path = `${prefix}${suffix}`;
  const parameters = [pathParam("channelId"), ...(options.parameters ?? [])];
  const operation = {
    operationId,
    tags: [tag],
    summary: options.summary ?? operationId,
    parameters,
    responses: {
      [responseStatus]: responseSchema ? jsonResponse(options.responseDescription ?? "Successful response", ref(responseSchema)) : emptyResponse(options.responseDescription ?? "Successful response"),
      "401": { $ref: "#/components/responses/Error" }, "403": { $ref: "#/components/responses/Error" },
      "413": { $ref: "#/components/responses/Error" }, "422": { $ref: "#/components/responses/ValidationError" },
      "429": { $ref: "#/components/responses/Error" }, "500": { $ref: "#/components/responses/Error" },
      "503": { $ref: "#/components/responses/Error" },
    },
  };
  if (options.body) operation.requestBody = body(ref(options.body));
  if (options.requestId) operation.parameters.push(headerParam("X-Request-ID", "Optional diagnostic request identifier."));
  if (options.sse) {
    operation["x-sse"] = true;
    operation.responses[responseStatus] = {
      description: "Server-Sent Events stream",
      content: { "text/event-stream": { schema: ref(options.sse), "x-sse-wire-format": "Each SSE data field is one JSON value matching this schema." } },
    };
  }
  if (options.binary) {
    operation.responses[responseStatus] = {
      description: "Streaming export",
      headers: { "Content-Disposition": { schema: { type: "string" } } },
      content: {
        "text/csv": { schema: { type: "string", format: "binary" } },
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { schema: { type: "string", format: "binary" } },
      },
    };
  }
  spec.paths[path] ??= {};
  spec.paths[path][method] = operation;
}

add("get", "/config", "getAgentsConfig", "Configuration", "200", "AgentsConfig");
add("get", "/conversations/{conversationId}/config", "getConversationConfig", "Configuration", "200", "ConversationConfig", { parameters: [pathParam("conversationId")] });
add("post", "", "createChat", "Chat", "201", "AiChatSubmission", { body: "AiChatInput" });
add("post", "/conversations/{conversationId}", "continueChat", "Chat", "201", "AiChatSubmission", { parameters: [pathParam("conversationId")], body: "AiChatInput" });
add("post", "/conversations/{conversationId}/stream", "streamChatEvents", "Chat", "200", null, { parameters: [pathParam("conversationId")], body: "AiChatStreamInput", requestId: true, sse: "AiChatBriefEvent" });
add("post", "/stream-probe", "probeEventStream", "Chat", "200", null, { body: "ChatStreamProbeInput", requestId: true, sse: "ChatStreamProbeEvent" });
add("delete", "/conversations/{conversationId}/interrupt", "interruptConversation", "Chat", "200", null, { parameters: [pathParam("conversationId")] });
add("post", "/conversations/{conversationId}/compact", "compactConversation", "Chat", "202", null, { parameters: [pathParam("conversationId"), queryParam("force", { type: "boolean", default: true })] });
add("get", "/conversations/{conversationId}/context-usage", "getConversationContextUsage", "Conversations", "200", "ConversationContextUsage", { parameters: [pathParam("conversationId")] });
add("get", "/conversations", "listConversations", "Conversations", "200", "ConversationSummaryList", { parameters: [...pageParams, queryParam("status")] });
add("get", "/conversations/active", "listActiveConversations", "Conversations", "200", "ConversationIds");
add("get", "/conversations/unread", "listUnreadConversations", "Conversations", "200", "ConversationIds");
add("post", "/conversations/activity/query", "queryConversationActivities", "Conversations", "200", "ConversationActivityList", { body: "ConversationActivityBatchInput" });
add("put", "/conversations/{conversationId}/read-receipt", "markConversationRead", "Conversations", "200", "ConversationReadReceipt", { parameters: [pathParam("conversationId")], body: "ConversationReadReceiptInput" });
add("get", "/conversations/stats", "getConversationStats", "Conversations", "200", "ConversationStats");
add("get", "/conversations/{conversationId}/title", "getConversationTitle", "Conversations", "200", "ConversationTitle", { parameters: [pathParam("conversationId")] });
add("patch", "/conversations/{conversationId}/title", "updateConversationTitle", "Conversations", "202", null, { parameters: [pathParam("conversationId")], body: "ConversationTitleInput" });
add("patch", "/conversations/{conversationId}/status", "updateConversationStatus", "Conversations", "202", null, { parameters: [pathParam("conversationId")], body: "ConversationStatusInput" });
add("delete", "/conversations/{conversationId}", "deleteConversation", "Conversations", "200", null, { parameters: [pathParam("conversationId")] });
add("get", "/conversations/{conversationId}/sql-query-results/{resultId}", "getSqlQueryResult", "SQL", "200", "SqlQueryResultPage", { parameters: [pathParam("conversationId"), pathParam("resultId"), queryParam("current", { type: "integer", minimum: 0, default: 0 }), queryParam("size", { type: "integer", minimum: 1, maximum: 1000, default: 100 })] });
add("get", "/conversations/{conversationId}/sql-query-results/{resultId}/chart-data", "getSqlQueryChartData", "SQL", "200", "SqlChartDataset", { parameters: [pathParam("conversationId"), pathParam("resultId")] });
add("get", "/conversations/{conversationId}/sql-query-results/{resultId}/export", "exportSqlQueryResult", "SQL", "200", null, { parameters: [pathParam("conversationId"), pathParam("resultId"), queryParam("format", { type: "string", enum: ["CSV", "XLSX"] }, true), headerParam("Accept", "Requested export media type.")], binary: true });
add("get", "/conversations/{conversationId}/messages", "listConversationMessages", "Messages", "200", "ConversationMessagePage", { parameters: [pathParam("conversationId"), ...pageParams] });
add("get", "/conversations/{conversationId}/messages/{messageId}", "getConversationMessage", "Messages", "200", "ConversationMessage", { parameters: [pathParam("conversationId"), pathParam("messageId")] });
add("get", "/conversations/{conversationId}/async-tasks", "listConversationAsyncTasks", "Messages", "200", "AsyncTaskPage", { parameters: [pathParam("conversationId"), ...pageParams, queryParam("status", { type: "array", items: { type: "string" } })] });
add("get", "/conversations/{conversationId}/async-tasks/{asyncTaskId}", "getConversationAsyncTask", "Messages", "200", "AsyncTask", { parameters: [pathParam("conversationId"), pathParam("asyncTaskId")] });
add("delete", "/conversations/{conversationId}/messages/{messageId}/queue", "cancelQueuedMessage", "Messages", "200", "ConversationMessage", { parameters: [pathParam("conversationId"), pathParam("messageId")] });
add("get", "/events", "getChatEvents", "Events", "200", "AiChatBriefEventList", { parameters: [queryParam("conversationId", { type: "string" }, true), queryParam("messageId", { type: "string" }, true)] });
add("post", "/events/batch", "getChatEventsBatch", "Events", "201", "AiChatEventsBatch", { body: "AiChatEventsBatchInput" });
add("get", "/conversations/{conversationId}/shares", "listConversationShares", "Conversations", "200", "ConversationShareList", { parameters: [pathParam("conversationId")] });
add("post", "/conversations/{conversationId}/shares", "createConversationShare", "Conversations", "201", "ConversationShareCreated", { parameters: [pathParam("conversationId")], body: "ConversationShareInput" });
add("delete", "/conversations/{conversationId}/shares/{shareId}", "revokeConversationShare", "Conversations", "200", "ConversationShareRevoked", { parameters: [pathParam("conversationId"), pathParam("shareId", "int64")] });
add("post", "/plan/approve", "approvePlan", "Interactions", "201", "OperationResult", { body: "PlanApprovalInput" });
add("get", "/plan/{planId}/status", "getPlanStatus", "Interactions", "200", "PlanStatus", { parameters: [pathParam("planId")] });
add("get", "/user-input/{questionId}/status", "getUserInputStatus", "Interactions", "200", "UserInputStatus", { parameters: [pathParam("questionId"), queryParam("conversationId", { type: "string" }, true), queryParam("messageId", { type: "string" }, true)] });
add("post", "/user-input/answer", "answerUserInput", "Interactions", "201", "OperationResult", { body: "UserInputAnswerInput" });
add("post", "/files/pre-signed-url/write", "createPreSignedUpload", "Files", "201", "GeneratePreSignedUrlOutput", { body: "GeneratePreSignedUrlInput" });
add("post", "/files/pre-signed-url/confirm", "confirmPreSignedUpload", "Files", "201", "AgentFile", { body: "ConfirmUploadInput" });
add("post", "/files/contentMd5", "createFileByContentMd5", "Files", "201", "AgentFile", { body: "CreateFileInput" });
add("get", "/files/meta/contentMd5", "fileExistsByContentMd5", "Files", "200", "FileExists", { parameters: [queryParam("contentMd5", { type: "string" }, true)] });
add("get", "/conversations/{conversationId}/files/{fileId}/preview", "getConversationFilePreview", "Files", "200", "PreSignedReadUrl", { parameters: [pathParam("conversationId"), pathParam("fileId", "int64")] });
add("get", "/conversations/{conversationId}/messages/{messageId}/plan-intermediate-files/{fileId}/preview", "getPlanIntermediateFilePreview", "Files", "200", "PreSignedReadUrl", { parameters: [pathParam("conversationId"), pathParam("messageId"), pathParam("fileId", "int64")] });
add("post", "/knowledge-bases/citations/metadata", "getCitationMetadataBatch", "Knowledge", "201", "CitationMetadataList", { body: "ReturnedReferenceList" });
add("get", "/knowledge-bases/citations/{citationType}/{referenceId}/metadata", "getCitationMetadata", "Knowledge", "200", "CitationMetadata", { parameters: [pathParam("citationType"), pathParam("referenceId", "int64")] });
add("get", "/conversations/{conversationId}/workspace/files", "listWorkspaceArtifacts", "Workspace", "200", "WorkspaceArtifactList", { parameters: [pathParam("conversationId"), ...pageParams, queryParam("prefix")] });
add("get", "/conversations/{conversationId}/workspace/files/preview", "getWorkspaceFilePreview", "Workspace", "200", "PreSignedReadUrl", { parameters: [pathParam("conversationId"), queryParam("path", { type: "string" }, true)] });
schemas.ReturnedReferenceList = { type: "array", items: ref("ReturnedReference"), minItems: 1 };

const operationSummaries = {
  getAgentsConfig: "读取 Agent 配置 / Get Agent configuration",
  getConversationConfig: "读取会话配置 / Get conversation configuration",
  createChat: "创建会话并提交消息 / Create a conversation and submit a message",
  continueChat: "向已有会话提交消息 / Submit a message to an existing conversation",
  streamChatEvents: "订阅消息事件流 / Stream message events",
  probeEventStream: "探测 SSE 连接 / Probe the SSE connection",
  interruptConversation: "中断会话执行 / Interrupt conversation execution",
  compactConversation: "压缩会话上下文 / Compact conversation context",
  getConversationContextUsage: "读取上下文占用 / Get context usage",
  listConversations: "分页查询会话 / List conversations",
  listActiveConversations: "查询活动会话 / List active conversations",
  listUnreadConversations: "查询未读会话 / List unread conversations",
  queryConversationActivities: "批量查询会话活动 / Query conversation activities",
  markConversationRead: "推进会话已读游标 / Mark a conversation as read",
  getConversationStats: "读取会话统计 / Get conversation statistics",
  getConversationTitle: "读取会话标题 / Get conversation title",
  updateConversationTitle: "更新会话标题 / Update conversation title",
  updateConversationStatus: "更新会话状态 / Update conversation status",
  deleteConversation: "删除会话 / Delete a conversation",
  getSqlQueryResult: "分页读取 SQL 结果 / Get paged SQL results",
  getSqlQueryChartData: "读取 SQL 图表数据 / Get SQL chart data",
  exportSqlQueryResult: "导出 SQL 结果 / Export SQL results",
  listConversationMessages: "分页查询会话消息 / List conversation messages",
  getConversationMessage: "读取单条会话消息 / Get a conversation message",
  listConversationAsyncTasks: "分页查询异步任务 / List asynchronous tasks",
  getConversationAsyncTask: "读取异步任务 / Get an asynchronous task",
  cancelQueuedMessage: "取消排队消息 / Cancel a queued message",
  getChatEvents: "读取消息事件 / Get message events",
  getChatEventsBatch: "批量读取消息事件 / Get message events in batch",
  listConversationShares: "查询会话分享 / List conversation shares",
  createConversationShare: "创建会话分享 / Create a conversation share",
  revokeConversationShare: "撤销会话分享 / Revoke a conversation share",
  approvePlan: "提交计划审批 / Submit plan approval",
  getPlanStatus: "查询计划审批状态 / Get plan approval status",
  getUserInputStatus: "查询用户问答状态 / Get user-input status",
  answerUserInput: "提交用户回答 / Submit a user answer",
  createPreSignedUpload: "创建预签名上传地址 / Create a presigned upload URL",
  confirmPreSignedUpload: "确认预签名上传 / Confirm a presigned upload",
  createFileByContentMd5: "按 MD5 复用文件 / Reuse a file by MD5",
  fileExistsByContentMd5: "检查 MD5 文件是否存在 / Check file existence by MD5",
  getConversationFilePreview: "创建会话文件预览地址 / Create a conversation file preview URL",
  getPlanIntermediateFilePreview: "创建计划快照预览地址 / Create a plan snapshot preview URL",
  getCitationMetadataBatch: "批量读取引用元数据 / Get citation metadata in batch",
  getCitationMetadata: "读取引用元数据 / Get citation metadata",
  listWorkspaceArtifacts: "分页查询工作区制品 / List workspace artifacts",
  getWorkspaceFilePreview: "创建工作区文件预览地址 / Create a workspace file preview URL",
};

const parameterDescriptions = {
  channelId: "Agent OpenAPI 渠道 UUID。 / Agent OpenAPI channel UUID.",
  conversationId: "会话 ID；必须属于当前外部用户。 / Conversation ID owned by the current external user.",
  messageId: "用户消息 ID；必须属于指定会话。 / User-message ID owned by the specified conversation.",
  asyncTaskId: "异步任务 ID。 / Asynchronous task ID.",
  resultId: "SQL 查询结果 ID。 / SQL query-result ID.",
  shareId: "会话分享记录 ID。 / Conversation-share record ID.",
  planId: "等待审批的计划 ID。 / Pending plan-approval ID.",
  questionId: "等待回答的问题 ID。 / Pending question ID.",
  fileId: "文件记录 ID。 / File record ID.",
  referenceId: "知识引用记录 ID。 / Knowledge-reference record ID.",
  citationType: "知识引用类型。 / Knowledge citation type.",
  current: "从 0 开始的页码。 / Zero-based page index.",
  size: "单页记录数。 / Number of records per page.",
  orderBy: "排序字段列表。 / Ordered list of sort fields.",
  orderDirection: "排序方向。 / Sort direction.",
  orderNullHandling: "空值排序策略。 / Null ordering strategy.",
  keyword: "标题或正文检索关键字。 / Title or content search keyword.",
  status: "状态过滤条件。 / Status filter.",
  force: "是否忽略当前阈值并强制压缩。 / Whether to compact regardless of the current threshold.",
  format: "导出格式。 / Export format.",
  Accept: "期望的导出媒体类型。 / Requested export media type.",
  contentMd5: "文件内容 MD5。 / MD5 digest of the file content.",
  prefix: "工作区相对路径前缀。 / Workspace-relative path prefix.",
  path: "工作区相对文件路径。 / Workspace-relative file path.",
  "X-Request-ID": "可选诊断请求 ID，便于关联客户端与服务端日志。 / Optional diagnostic request ID used to correlate client and server logs.",
};

const fieldLabels = {
  records: "记录列表 / records", page: "分页信息 / page metadata", rawJson: "未识别对象的原始 JSON / raw JSON for an unrecognized object",
  type: "类型判别值 / type discriminator", category: "扩展类别判别值 / extension category discriminator",
  content: "与类别对应的强类型内容 / strongly typed content for the category", specialRender: "是否使用独立视图渲染 / whether to use a dedicated view",
  createdTime: "创建时间 / creation time", lastUpdateTime: "最后更新时间 / last update time", status: "当前状态 / current status",
  conversationId: "会话 ID / conversation ID", messageId: "消息 ID / message ID", taskId: "异步任务 ID / asynchronous task ID",
  fileId: "文件 ID / file ID", fileName: "文件名 / file name", mimeType: "MIME 类型 / MIME type", size: "大小（字节）或分页容量 / byte size or page size",
  inputTokens: "输入 Token 数 / input token count", outputTokens: "输出 Token 数 / output token count", totalTokens: "总 Token 数 / total token count",
  description: "可读说明 / human-readable description", title: "标题 / title", message: "消息正文 / message text", query: "用户问题 / user query",
  url: "预签名 URL / presigned URL", support: "当前存储是否支持该操作 / whether the storage supports this operation",
};

const words = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").toLowerCase();
const describeField = (name) => `${fieldLabels[name] ?? `字段 ${name} / ${words(name)} field`}。`;
const walkSchema = (node, propertyName) => {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  if (propertyName && !node.description?.includes(" / ")) node.description = `${describeField(propertyName)}${node.description ? ` ${node.description}` : ""}`;
  if (node.type === "object") node.additionalProperties = false;
  if (node.properties) for (const [name, property] of Object.entries(node.properties)) walkSchema(property, name);
  if (node.items) walkSchema(node.items);
  for (const keyword of ["oneOf", "allOf", "anyOf"]) if (node[keyword]) node[keyword].forEach((child) => walkSchema(child));
};
for (const [name, schema] of Object.entries(schemas)) {
  schema.description ??= `${name} 的公开协议结构。 / Public contract for ${words(name)}.`;
  walkSchema(schema);
}
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    operation.summary = operationSummaries[operation.operationId];
    operation.description = `${operation.summary} 请求会在身份验签和资源归属校验后执行；响应字段以本契约为准。 / The request runs after signature and resource-ownership validation; this contract defines the response fields.`;
    for (const parameter of operation.parameters) parameter.description = parameterDescriptions[parameter.name] ?? parameter.description ?? describeField(parameter.name);
    if (operation.requestBody) operation.requestBody.description = `${operation.summary} 的 JSON 请求参数。 / JSON request parameters for ${operation.operationId}.`;
    for (const response of Object.values(operation.responses)) {
      if (response.description === "Successful response") response.description = `${operation.summary} 的成功响应。 / Successful response for ${operation.operationId}.`;
    }
  }
}

const yaml = YAML.stringify(spec, { indent: 2, lineWidth: 0 });
await writeFile(new URL("lingya-agents-v1.yaml", contractDir), yaml, "utf8");
await writeFile(new URL("lingya-agents-v1.json", contractDir), `${JSON.stringify(spec, null, 2)}\n`, "utf8");
const endpointManifest = Object.entries(spec.paths).flatMap(([path, item]) =>
  Object.entries(item).map(([method, operation]) => ({ method: method.toUpperCase(), path, operationId: operation.operationId })),
);
await writeFile(new URL("endpoints.json", contractDir), `${JSON.stringify(endpointManifest, null, 2)}\n`, "utf8");

const vectorsUrl = new URL("test-vectors/hmac-v1.json", root);
const vectors = JSON.parse(await readFile(vectorsUrl, "utf8"));
for (const item of vectors.cases) {
  const bodyBytes = Buffer.from(item.bodyBase64, "base64url");
  const bodyHash = createHash("sha256").update(bodyBytes).digest("hex");
  const fields = [vectors.version, item.accessKey, item.timestamp, item.nonce, item.method, item.rawPath, item.rawQuery, item.encodedUser, item.contentType, bodyHash];
  item.canonical = fields.join("\n");
  item.signature = createHmac("sha256", item.secret).update(item.canonical, "utf8").digest("hex");
}
await writeFile(vectorsUrl, `${JSON.stringify(vectors, null, 2)}\n`, "utf8");
