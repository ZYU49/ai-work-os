export type BasicAuthConfig = {
  username: string;
  password?: string;
};

export const AUTH_SESSION_COOKIE = "ai_work_os_session";
const AUTH_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export function buildBasicAuthChallenge(realm: string) {
  return `Basic realm="${realm}", charset="UTF-8"`;
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

function decodeBasicAuthHeader(authorization: string) {
  if (!authorization.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = atob(authorization.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function isBasicAuthAuthorized(
  authorization: string | null,
  config: BasicAuthConfig,
) {
  if (!config.password) {
    return true;
  }

  if (!authorization) {
    return false;
  }

  const credentials = decodeBasicAuthHeader(authorization);

  if (!credentials) {
    return false;
  }

  return (
    safeEqual(credentials.username, config.username) &&
    safeEqual(credentials.password, config.password)
  );
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function hmacSha256(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return new Uint8Array(signature);
}

function timingSafeBytesEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left[index] ^ right[index];
  }

  return result === 0;
}

export async function createAuthSessionToken(
  config: Required<BasicAuthConfig>,
  issuedAt = new Date(),
) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        username: config.username,
        issuedAt: issuedAt.toISOString(),
      }),
    ),
  );
  const signature = bytesToBase64Url(await hmacSha256(payload, config.password));

  return `${payload}.${signature}`;
}

export async function verifyAuthSessionToken(
  token: string | undefined,
  config: BasicAuthConfig,
  now = new Date(),
) {
  if (!config.password) {
    return true;
  }

  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return false;
  }

  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(payload));
    const parsed = JSON.parse(decoded) as {
      username?: string;
      issuedAt?: string;
    };
    const issuedAt = parsed.issuedAt ? new Date(parsed.issuedAt) : null;

    if (
      parsed.username !== config.username ||
      !issuedAt ||
      Number.isNaN(issuedAt.getTime()) ||
      now.getTime() - issuedAt.getTime() > AUTH_SESSION_MAX_AGE_MS
    ) {
      return false;
    }

    const expectedSignature = await hmacSha256(payload, config.password);

    return timingSafeBytesEqual(base64UrlToBytes(signature), expectedSignature);
  } catch {
    return false;
  }
}
