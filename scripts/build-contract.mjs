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
add("post", "/conversations/{conversationId}/shares", "createConversationShare", "Conversations", "201", "ConversationShare", { parameters: [pathParam("conversationId")], body: "ConversationShareInput" });
add("delete", "/conversations/{conversationId}/shares/{shareId}", "revokeConversationShare", "Conversations", "200", "ConversationShare", { parameters: [pathParam("conversationId"), pathParam("shareId", "int64")] });
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
