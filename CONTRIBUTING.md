# Contributing

Run `npm ci && npm run check` before opening a pull request. Contract changes must include examples and must not edit generated JSON or HTML without rebuilding them with `npm run build` and `npm run generate:docs`.

Breaking HTTP changes require a new API path version and a contract major version. Additive changes must keep existing operation IDs and schemas compatible.
