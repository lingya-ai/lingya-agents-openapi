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
const manifest = JSON.parse(await readFile(new URL("openapi/endpoints.json", root), "utf8"));

if (operations.length !== 46) throw new Error(`Expected 46 operations, found ${operations.length}`);
const ids = operations.map(({ operation }) => operation.operationId);
if (new Set(ids).size !== ids.length) throw new Error("operationId values must be unique");
for (const { path, method, operation } of operations) {
  if (!path.startsWith("/api/agents/channel/openapi/v1/{channelId}/chat")) throw new Error(`Unexpected public path: ${path}`);
  const channelParameter = operation.parameters.find((parameter) => parameter.name === "channelId" && parameter.in === "path");
  if (!channelParameter) throw new Error(`Missing channelId on ${method} ${path}`);
  if (channelParameter["x-lingya-sdk-bound-from"] !== "channelId") throw new Error(`Missing SDK channel binding on ${method} ${path}`);
  if (!operation.summary?.includes(" / ") || !operation.description?.includes(" / ")) throw new Error(`Missing bilingual operation documentation: ${method} ${path}`);
  if (operation.summary === operation.operationId) throw new Error(`summary must not repeat operationId: ${operation.operationId}`);
  for (const parameter of operation.parameters) {
    if (!parameter.description?.includes(" / ")) throw new Error(`Missing bilingual parameter documentation: ${operation.operationId}.${parameter.name}`);
  }
  if (operation.requestBody && !operation.requestBody.description?.includes(" / ")) throw new Error(`Missing bilingual request-body documentation: ${operation.operationId}`);
}
if (manifest.length !== operations.length) throw new Error(`Expected ${operations.length} manifest operations, found ${manifest.length}`);
for (const entry of manifest) {
  const operation = operations.find(({ path, method, operation }) => path === entry.path && method.toUpperCase() === entry.method && operation.operationId === entry.operationId);
  if (!operation) throw new Error(`Manifest operation does not exist in the contract: ${entry.method} ${entry.path}`);
  if (!entry.group || !entry.summary || !entry.description || !entry.relativePath.startsWith("/") && entry.relativePath !== "") {
    throw new Error(`Incomplete manifest metadata for ${entry.operationId}`);
  }
  const channelParameter = entry.parameters.find((parameter) => parameter.name === "channelId");
  if (channelParameter?.boundFrom !== "channelId") throw new Error(`Manifest does not bind channelId for ${entry.operationId}`);
}
if (JSON.stringify(yaml) !== JSON.stringify(json)) throw new Error("YAML and JSON contract artifacts differ");

const inspectSchema = (node, location) => {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  if (node.additionalProperties !== undefined && node.additionalProperties !== false) throw new Error(`Free-form object is forbidden: ${location}`);
  if (node.type === "object" && !node.properties && !node.$ref && !node.oneOf && !node.allOf) throw new Error(`Object without explicit properties is forbidden: ${location}`);
  if (node.properties) {
    for (const [name, property] of Object.entries(node.properties)) {
      if (!property.description?.includes(" / ")) throw new Error(`Missing bilingual property documentation: ${location}.${name}`);
      inspectSchema(property, `${location}.${name}`);
    }
  }
  if (node.items) inspectSchema(node.items, `${location}[]`);
  for (const keyword of ["oneOf", "allOf", "anyOf"]) {
    if (node[keyword]) node[keyword].forEach((child, index) => inspectSchema(child, `${location}.${keyword}[${index}]`));
  }
};
for (const [name, schema] of Object.entries(yaml.components.schemas)) {
  if (!schema.description?.includes(" / ")) throw new Error(`Missing bilingual schema documentation: ${name}`);
  if (schema.oneOf && !schema.discriminator && !schema.oneOf.some((item) => item.type === "null")) throw new Error(`Polymorphic schema requires a discriminator: ${name}`);
  inspectSchema(schema, name);
}

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
