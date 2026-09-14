# Lingya Agents OpenAPI

Canonical OpenAPI 3.1 contract for the signed Lingya Agents channel API. It covers the 46 operations below the `/api/agents/channel/openapi/v1/{channelId}/chat` base path. Studio administration endpoints are intentionally excluded.

## Validate and build

```bash
npm ci
npm run check
npm run generate:docs
```

The source contract is `openapi/lingya-agents-v1.yaml`. `openapi/lingya-agents-v1.json` and `docs/index.html` are deterministic generated artifacts.

Request/response examples live in `examples/`; deterministic HMAC vectors and an SSE wire sample live in `test-vectors/`. OpenAPI Generator is pinned to 7.25.0 through `openapitools.json`.

## Authentication

Every request sends `X-OpenAPI-AK`, `X-OpenAPI-Timestamp`, `X-OpenAPI-Nonce`, `X-OpenAPI-User`, and `X-OpenAPI-Signature`. The canonical input is documented in the contract and verified by `test-vectors/hmac-v1.json`.

Never expose the access secret to a browser or an untrusted client.

See [README.zh-CN.md](README.zh-CN.md) for Chinese documentation.
