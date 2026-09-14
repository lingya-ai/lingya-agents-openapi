import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

const root = new URL("../", import.meta.url);
const yaml = YAML.parse(await readFile(new URL("openapi/lingya-agents-v1.yaml", root), "utf8"));
const json = JSON.parse(await readFile(new URL("openapi/lingya-agents-v1.json", root), "utf8"));
const operations = Object.entries(yaml.paths).flatMap(([path, item]) =>
  Object.entries(item).filter(([method]) => ["get", "post", "put", "patch", "delete"].includes(method)).map(([method, operation]) => ({ path, method, operation })),
);

if (operations.length !== 46) throw new Error(`Expected 46 operations, found ${operations.length}`);
const ids = operations.map(({ operation }) => operation.operationId);
if (new Set(ids).size !== ids.length) throw new Error("operationId values must be unique");
for (const { path, method, operation } of operations) {
  if (!path.startsWith("/api/agents/channel/openapi/v1/{channelId}/chat")) throw new Error(`Unexpected public path: ${path}`);
  if (!operation.parameters.some((parameter) => parameter.name === "channelId" && parameter.in === "path")) throw new Error(`Missing channelId on ${method} ${path}`);
}
if (JSON.stringify(yaml) !== JSON.stringify(json)) throw new Error("YAML and JSON contract artifacts differ");

const vectors = JSON.parse(await readFile(new URL("test-vectors/hmac-v1.json", root), "utf8"));
for (const item of vectors.cases) {
  if (!/^[0-9a-f]{64}$/.test(item.signature)) throw new Error(`Invalid signature vector ${item.name}`);
  if (item.canonical.endsWith("\n")) throw new Error(`Canonical value has a trailing newline: ${item.name}`);
}

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(yaml, "urn:lingya:agents-openapi");
const examples = [
  ["create-chat.json", "AiChatInput", "AiChatSubmission"],
  ["list-conversations.json", null, "ConversationSummaryList"],
  ["get-agents-config.json", null, "AgentsConfig"],
  ["create-pre-signed-upload.json", "GeneratePreSignedUrlInput", "GeneratePreSignedUrlOutput"],
];
for (const [example, requestSchema, responseSchema] of examples) {
  const document = JSON.parse(await readFile(new URL(`examples/${example}`, root), "utf8"));
  if (!document.request?.method || !document.request?.path || !document.response?.status) {
    throw new Error(`Incomplete example: ${example}`);
  }
  for (const [body, schema] of [[document.request.body, requestSchema], [document.response.body, responseSchema]]) {
    if (!schema) continue;
    const validate = ajv.compile({ $ref: `urn:lingya:agents-openapi#/components/schemas/${schema}` });
    if (!validate(body)) throw new Error(`Invalid ${schema} example in ${example}: ${ajv.errorsText(validate.errors)}`);
  }
}

console.log(`Validated ${operations.length} operations, ${vectors.cases.length} HMAC vectors, and ${examples.length} examples.`);
