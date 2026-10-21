# Contributing

Run `npm ci && npm run check` before opening a pull request. Contract changes must include examples and must not edit generated JSON or HTML without rebuilding them with `npm run build` and `npm run generate:docs`.

Breaking HTTP changes require a new API path version and a contract major version. Additive changes must keep existing operation IDs and schemas compatible.

SDK runtime sources, facade generators, templates, package inputs and generation configuration live in `sdk/<language>/`. After changing them, run `npm run generate:sdks`, then run the affected SDK checks. Commit the canonical inputs and generated SDK files, including each `SDK_GENERATION.json`. `npm run sync:sdks` is a compatibility alias; no standalone SDK generation step is required. Use `npm run check:sdks` to verify all managed files; run it twice to check deterministic output. Normal SDK builds use committed source files.

See [request lifecycle and generation](docs/request-lifecycle.md) for the current authentication, cancellation, SSE/WebSocket and browser compatibility behavior.
