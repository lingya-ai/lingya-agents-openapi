# Changelog

## 1.0.0 - 2026-10-23

- Promote the public contract to 1.0.0 together with all four SDKs; the HTTP base path remains `/api/agents/channel/openapi/v1/{channelId}/chat`.
- Presigned uploads: add `sizeBytes` to `GeneratePreSignedUrlInput` and `uploadMethod`, `formFields`, `maximumBytes` to `GeneratePreSignedUrlOutput`.
- Fix `ReturnedReference` to use the server-side `citationType` field; batch citation metadata previously could not bind.
- Align response models with server DTOs: `TaskSummary` is `{id, content, status}`; drop the nonexistent `currentTaskId`, `currentTaskStatus` and `archived` from `TaskProgressExtensionContent`; add `WorkspaceFile.fileId`; add `WorkspaceNonFileArtifact.htmlPageAuthoringMode`; add `AiChatErrorBriefEvent.terminalReason` and `AiChatUserQueryBriefEvent.executionType`.
- Remove fields the server never returns: `AiChatFileRef.fileName` and `SubagentTask.progressPercent`; correct `ConversationSummary.messageCount` to int32.

## 0.1.7 - 2026-10-20

- Centralize four SDK runtimes, facade generators, templates and shared lifecycle vectors; add deterministic generation manifests and full-source CI checks.
- Describe WebSocket handshake/control frames with x-lingya-websocket and generate transports.json.
- Clarify single-use token consumption, ten-minute expiry, identity binding, and fresh-token requirements for requests, retries, and stream reconnections.
- Align all 64 HTTP operations with the latest channel controller and document token authentication and WebSocket transport.
- Correct request limits, modes, pagination, metadata and title responses; remove unavailable sharing and internal model events.

## Unreleased

- Preserve Python 3.10 async timeout classification in the canonical SDK runtime.

- Add a left-navigation signing guide for clients that call the API with raw HTTP.

## 0.1.5 - 2026-09-27

- Add asynchronous-task sync and subagent list, sync, detail, result, and cancellation operations.
- Correct the workspace non-file artifact schema to match the server DTO.

## 0.1.4 - 2026-09-16

- Add bilingual use-case guides for all ten API groups and structured guidance for all 46 operations.
- Add validated Raw HTTP, cURL, request, and success-response examples for every operation.
- Add a golden-vector-backed local HMAC signing tool and self-contained ReDoc HTML without remote runtime assets.
- Publish the generated reference through GitHub Pages and attach the complete example manifest to releases.

## 0.1.3

- Mark `channelId` as a client-bound SDK parameter without changing the HTTP contract.
- Expand the generated endpoint manifest with groups, typed inputs, responses, parameters, and streaming metadata.

## 0.1.2 - 2026-09-14

- Constrain public pre-signed uploads to the registered `ai-chat-attachments` module verified against the deployed API.
- Add a validated pre-signed upload request and response example.

## 0.1.1 - 2026-09-14

- Correct the Agent configuration response to match the deployed `modelConfig`, attachment metadata, and attachment limit structure.

## 0.1.0 - 2026-09-14

- Publish the initial OpenAPI 3.1 contract for all 46 signed Agent channel operations.
- Define HMAC-SHA256-V1 canonicalization and portable signature test vectors.
- Define typed SSE event variants and forward-compatible unknown events.
