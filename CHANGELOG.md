# Changelog

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
