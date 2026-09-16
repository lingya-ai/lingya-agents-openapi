import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";
import { createCanonicalRequest, signCanonicalRequest } from "./hmac.mjs";

const root = new URL("../", import.meta.url);
const yaml = YAML.parse(await readFile(new URL("openapi/lingya-agents-v1.yaml", root), "utf8"));
const json = JSON.parse(await readFile(new URL("openapi/lingya-agents-v1.json", root), "utf8"));
const manifest = JSON.parse(await readFile(new URL("openapi/endpoints.json", root), "utf8"));
const httpExamples = JSON.parse(await readFile(new URL("examples/http-requests.json", root), "utf8"));
const html = await readFile(new URL("docs/index.html", root), "utf8");
const operations = Object.entries(yaml.paths).flatMap(([path, item]) =>
  Object.entries(item)
    .filter(([method]) => ["get", "post", "put", "patch", "delete"].includes(method))
    .map(([method, operation]) => ({ path, method, operation })),
);

if (yaml.info.version !== "0.1.4") throw new Error(`Expected contract version 0.1.4, found ${yaml.info.version}`);
if (operations.length !== 46) throw new Error(`Expected 46 operations, found ${operations.length}`);
if (yaml.tags.length !== 10) throw new Error(`Expected 10 business groups, found ${yaml.tags.length}`);
const ids = operations.map(({ operation }) => operation.operationId);
if (new Set(ids).size !== ids.length) throw new Error("operationId values must be unique");
for (const tag of yaml.tags) {
  if (!tag.description?.includes("\n\n")) throw new Error(`Group guide must be bilingual: ${tag.name}`);
  if (!tag.description.includes("用于") || !tag.description.includes("Use this group")) throw new Error(`Missing group use-case guide: ${tag.name}`);
}

const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema(yaml, "urn:lingya:agents-openapi");
const validateSchemaExample = (schema, value, location) => {
  if (!schema?.$ref) return;
  const name = schema.$ref.split("/").at(-1);
  const validate = ajv.compile({ $ref: `urn:lingya:agents-openapi#/components/schemas/${name}` });
  if (!validate(value)) throw new Error(`Invalid ${location} example for ${name}: ${ajv.errorsText(validate.errors)}`);
};

for (const { path, method, operation } of operations) {
  if (!path.startsWith("/api/agents/channel/openapi/v1/{channelId}/chat")) throw new Error(`Unexpected public path: ${path}`);
  const channelParameter = operation.parameters.find((parameter) => parameter.name === "channelId" && parameter.in === "path");
  if (!channelParameter) throw new Error(`Missing channelId on ${method} ${path}`);
  if (channelParameter["x-lingya-sdk-bound-from"] !== "channelId") throw new Error(`Missing SDK channel binding on ${method} ${path}`);
  if (!operation.summary?.includes(" / ")) throw new Error(`Missing bilingual operation summary: ${method} ${path}`);
  for (const heading of ["### 使用场景", "### Use case", "### 前置条件", "### Prerequisites", "### 行为与副作用", "### Behavior and side effects", "### 后续调用", "### Next step"]) {
    if (!operation.description?.includes(heading)) throw new Error(`Missing ${heading} documentation: ${operation.operationId}`);
  }
  if (operation.summary === operation.operationId) throw new Error(`summary must not repeat operationId: ${operation.operationId}`);
  for (const parameter of operation.parameters) {
    if (!parameter.description?.includes(" / ")) throw new Error(`Missing bilingual parameter documentation: ${operation.operationId}.${parameter.name}`);
    if (parameter.example === undefined) throw new Error(`Missing parameter example: ${operation.operationId}.${parameter.name}`);
  }
  if (operation.requestBody) {
    if (!operation.requestBody.description?.includes(" / ")) throw new Error(`Missing bilingual request-body documentation: ${operation.operationId}`);
    const media = operation.requestBody.content["application/json"];
    if (media?.example === undefined) throw new Error(`Missing request example: ${operation.operationId}`);
    validateSchemaExample(media.schema, media.example, `${operation.operationId} request`);
  }
  if (operation["x-codeSamples"]?.length !== 2) throw new Error(`Expected Raw HTTP and cURL samples: ${operation.operationId}`);
  if (operation["x-codeSamples"][0].label !== "Raw HTTP" || operation["x-codeSamples"][1].label !== "cURL + local HMAC") {
    throw new Error(`Unexpected code-sample labels: ${operation.operationId}`);
  }
  const success = Object.entries(operation.responses).find(([status]) => /^2\d\d$/.test(status));
  if (!success) throw new Error(`Missing success response: ${operation.operationId}`);
  for (const media of Object.values(success[1].content ?? {})) {
    if (media.schema?.format === "binary") continue;
    if (media.example === undefined) throw new Error(`Missing success response example: ${operation.operationId}`);
    validateSchemaExample(media.schema, media.example, `${operation.operationId} response`);
  }
}

if (manifest.length !== operations.length) throw new Error(`Expected ${operations.length} manifest operations, found ${manifest.length}`);
for (const entry of manifest) {
  const operation = operations.find(({ path, method, operation: candidate }) => path === entry.path && method.toUpperCase() === entry.method && candidate.operationId === entry.operationId);
  if (!operation) throw new Error(`Manifest operation does not exist in the contract: ${entry.method} ${entry.path}`);
  if (!entry.group || !entry.summary || !entry.description || (!entry.relativePath.startsWith("/") && entry.relativePath !== "")) throw new Error(`Incomplete manifest metadata for ${entry.operationId}`);
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
  for (const keyword of ["oneOf", "allOf", "anyOf"]) if (node[keyword]) node[keyword].forEach((child, index) => inspectSchema(child, `${location}.${keyword}[${index}]`));
};
for (const [name, schema] of Object.entries(yaml.components.schemas)) {
  if (!schema.description?.includes(" / ")) throw new Error(`Missing bilingual schema documentation: ${name}`);
  if (schema.oneOf && !schema.discriminator && !schema.oneOf.some((item) => item.type === "null")) throw new Error(`Polymorphic schema requires a discriminator: ${name}`);
  inspectSchema(schema, name);
}

const vectors = JSON.parse(await readFile(new URL("test-vectors/hmac-v1.json", root), "utf8"));
for (const item of vectors.cases) {
  const bodyBytes = Buffer.from(item.bodyBase64, "base64url");
  const canonical = createCanonicalRequest({
    version: vectors.version,
    accessKey: item.accessKey,
    timestamp: item.timestamp,
    nonce: item.nonce,
    method: item.method,
    rawPath: item.rawPath,
    rawQuery: item.rawQuery,
    encodedUser: item.encodedUser,
    contentType: item.contentType,
    bodyBytes,
  });
  if (canonical !== item.canonical) throw new Error(`Canonical HMAC vector drift: ${item.name}`);
  if (signCanonicalRequest(item.secret, canonical) !== item.signature) throw new Error(`HMAC signature drift: ${item.name}`);
  if (!/^[0-9a-f]{64}$/.test(item.signature)) throw new Error(`Invalid signature vector ${item.name}`);
  if (item.canonical.endsWith("\n")) throw new Error(`Canonical value has a trailing newline: ${item.name}`);
}

const cliVector = vectors.cases[0];
const cliOutput = execFileSync(process.execPath, [
  fileURLToPath(new URL("scripts/sign-request.mjs", root)), "--method", cliVector.method, "--path", cliVector.rawPath,
  "--query", cliVector.rawQuery, "--user", Buffer.from(cliVector.encodedUser, "base64url").toString("utf8"),
  "--content-type", cliVector.contentType, "--body", Buffer.from(cliVector.bodyBase64, "base64url").toString("utf8"),
  "--timestamp", cliVector.timestamp, "--nonce", cliVector.nonce,
], { encoding: "utf8", env: { ...process.env, OPENAPI_AK: cliVector.accessKey, OPENAPI_SK: cliVector.secret } });
const cliDocument = JSON.parse(cliOutput);
if (cliDocument.headers["X-OpenAPI-Signature"] !== cliVector.signature) throw new Error("Signing CLI does not match the golden vector");
if (cliOutput.includes(cliVector.secret)) throw new Error("Signing CLI leaked the secret");

if (httpExamples.version !== yaml.info.version || httpExamples.operations.length !== operations.length) throw new Error("HTTP example manifest coverage mismatch");
for (const example of httpExamples.operations) {
  const found = operations.find(({ operation }) => operation.operationId === example.operationId);
  if (!found || found.path !== example.path || found.method.toUpperCase() !== example.method) throw new Error(`Invalid HTTP example operation: ${example.operationId}`);
  if (!example.request.rawHttp || !example.request.curl) throw new Error(`Missing HTTP samples: ${example.operationId}`);
  if (example.request.curl.split("\n").some((line) => line.startsWith("+"))) throw new Error(`Malformed cURL sample: ${example.operationId}`);
  if (!example.request.curl.includes("scripts/sign-request.mjs")) throw new Error(`Unsigned cURL sample: ${example.operationId}`);
  const requestMedia = found.operation.requestBody?.content?.["application/json"];
  if (requestMedia) validateSchemaExample(requestMedia.schema, example.request.body, `${example.operationId} manifest request`);
  const success = Object.entries(found.operation.responses).find(([status]) => /^2\d\d$/.test(status));
  const jsonMedia = success?.[1]?.content?.["application/json"];
  if (jsonMedia) validateSchemaExample(jsonMedia.schema, example.response.body, `${example.operationId} manifest response`);
}

const legacyExamples = [
  ["create-chat.json", "AiChatInput", "AiChatSubmission"], ["list-conversations.json", null, "ConversationSummaryList"],
  ["get-agents-config.json", null, "AgentsConfig"], ["create-pre-signed-upload.json", "GeneratePreSignedUrlInput", "GeneratePreSignedUrlOutput"],
];
for (const [example, requestSchema, responseSchema] of legacyExamples) {
  const document = JSON.parse(await readFile(new URL(`examples/${example}`, root), "utf8"));
  if (!document.request?.method || !document.request?.path || !document.response?.status) throw new Error(`Incomplete example: ${example}`);
  for (const [body, schema] of [[document.request.body, requestSchema], [document.response.body, responseSchema]]) {
    if (!schema) continue;
    const validate = ajv.compile({ $ref: `urn:lingya:agents-openapi#/components/schemas/${schema}` });
    if (!validate(body)) throw new Error(`Invalid ${schema} example in ${example}: ${ajv.errorsText(validate.errors)}`);
  }
}

if (html.includes("<script src=") || html.includes("fonts.googleapis.com") || html.includes("cdn.redoc.ly")) throw new Error("Generated HTML must not depend on remote runtime assets");
for (const tag of yaml.tags) if (!html.includes(`\"name\":\"${tag.name}\"`)) throw new Error(`HTML is missing group ${tag.name}`);
for (const id of ids) if (!html.includes(`\"operationId\":\"${id}\"`)) throw new Error(`HTML is missing operation ${id}`);
if ((html.match(/\"x-codeSamples\"/g) ?? []).length < 46) throw new Error("HTML must embed code samples for all 46 operations");
for (const item of vectors.cases) if (html.includes(item.secret)) throw new Error(`Generated HTML contains a golden-vector secret: ${item.name}`);

console.log(`Validated ${operations.length} operations, ${yaml.tags.length} groups, ${vectors.cases.length} HMAC vectors, and ${httpExamples.operations.length * 2} HTTP samples.`);
