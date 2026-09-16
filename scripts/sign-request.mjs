#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createNonce, encodeExternalUser, signRequest } from "./hmac.mjs";

function parseArguments(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const token = values[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const name = token.slice(2);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    result[name] = value;
    index += 1;
  }
  return result;
}

function quoteShell(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

const args = parseArguments(process.argv.slice(2));
const accessKey = process.env.OPENAPI_AK;
const secretKey = process.env.OPENAPI_SK;
const externalUserId = args.user ?? process.env.EXTERNAL_USER_ID;
if (!accessKey || !secretKey) throw new Error("OPENAPI_AK and OPENAPI_SK must be set in the environment");
if (!externalUserId) throw new Error("Provide --user or set EXTERNAL_USER_ID");
if (!args.method || !args.path) throw new Error("--method and --path are required");
if (args["body-file"] && args.body) throw new Error("Use either --body-file or --body, not both");

const bodyBytes = args["body-file"]
  ? await readFile(args["body-file"])
  : Buffer.from(args.body ?? "", "utf8");
const timestamp = args.timestamp ?? Math.floor(Date.now() / 1000).toString();
const nonce = args.nonce ?? createNonce();
const encodedUser = encodeExternalUser(externalUserId);
const contentType = args["content-type"] ?? "";
const signed = signRequest({
  accessKey,
  secretKey,
  timestamp,
  nonce,
  method: args.method,
  rawPath: args.path,
  rawQuery: args.query ?? "",
  encodedUser,
  contentType,
  bodyBytes,
});
const headers = {
  "X-OpenAPI-AK": accessKey,
  "X-OpenAPI-Timestamp": timestamp,
  "X-OpenAPI-Nonce": nonce,
  "X-OpenAPI-User": encodedUser,
  "X-OpenAPI-Signature": signed.signature,
};

switch (args.format ?? "json") {
  case "json":
    process.stdout.write(`${JSON.stringify({ headers, bodySha256: signed.canonical.split("\n").at(-1) }, null, 2)}\n`);
    break;
  case "curl":
    process.stdout.write(`${Object.entries(headers).map(([name, value]) => `-H ${quoteShell(`${name}: ${value}`)}`).join(" \\\n")}\n`);
    break;
  case "shell":
    for (const [name, value] of Object.entries(headers)) {
      process.stdout.write(`export ${name.replaceAll("-", "_").toUpperCase()}=${quoteShell(value)}\n`);
    }
    break;
  default:
    throw new Error("--format must be json, curl, or shell");
}
