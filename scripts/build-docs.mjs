import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";

const root = new URL("../", import.meta.url);
const require = createRequire(import.meta.url);
const spec = JSON.parse(await readFile(new URL("openapi/lingya-agents-v1.json", root), "utf8"));
const redocBundle = await readFile(require.resolve("redoc/bundles/redoc.standalone.js"), "utf8");
const escapeScript = (value) => value.replaceAll("</script", "<\\/script");
const serializedSpec = escapeScript(JSON.stringify(spec));
const runtime = escapeScript(redocBundle).replaceAll(
  "https://cdn.redoc.ly/redoc/logo-mini.svg",
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
);
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="灵涯 Agents OpenAPI 接口、业务场景、HTTP 请求和响应示例。 Lingya Agents OpenAPI operations, use cases, and HTTP examples.">
  <title>灵涯 Agents OpenAPI / Lingya Agents OpenAPI</title>
  <style>html,body,#redoc{margin:0;min-height:100%;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}</style>
</head>
<body>
  <div id="redoc"></div>
  <script>${runtime}</script>
  <script>
    const spec = ${serializedSpec};
    Redoc.init(spec, {
      disableGoogleFont: true,
      expandResponses: "200,201,202",
      hideDownloadButton: false,
      jsonSampleExpandLevel: 3,
      nativeScrollbars: true,
      pathInMiddlePanel: true,
      requiredPropsFirst: true,
      sortOperationsAlphabetically: false,
      theme: { typography: { fontFamily: 'system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif' } }
    }, document.getElementById("redoc"));
  </script>
</body>
</html>
`;
await mkdir(new URL("docs/", root), { recursive: true });
await writeFile(new URL("docs/index.html", root), html, "utf8");
