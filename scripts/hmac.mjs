import { createHash, createHmac, randomBytes } from "node:crypto";

export const HMAC_VERSION = "OPENAPI-HMAC-SHA256-V1";

export function encodeExternalUser(externalUserId) {
  return Buffer.from(externalUserId, "utf8").toString("base64url");
}

export function createNonce(size = 24) {
  if (size < 16 || size > 64) throw new Error("Nonce size must be between 16 and 64 bytes");
  return randomBytes(size).toString("base64url");
}

export function sha256Hex(bodyBytes) {
  return createHash("sha256").update(bodyBytes).digest("hex");
}

export function createCanonicalRequest({
  accessKey,
  timestamp,
  nonce,
  method,
  rawPath,
  rawQuery = "",
  encodedUser,
  contentType = "",
  bodyBytes = Buffer.alloc(0),
  version = HMAC_VERSION,
}) {
  return [
    version,
    accessKey,
    String(timestamp),
    nonce,
    method.toUpperCase(),
    rawPath,
    rawQuery,
    encodedUser,
    contentType,
    sha256Hex(bodyBytes),
  ].join("\n");
}

export function signCanonicalRequest(secretKey, canonicalRequest) {
  return createHmac("sha256", secretKey).update(canonicalRequest, "utf8").digest("hex");
}

export function signRequest(input) {
  const canonical = createCanonicalRequest(input);
  return { canonical, signature: signCanonicalRequest(input.secretKey, canonical) };
}
