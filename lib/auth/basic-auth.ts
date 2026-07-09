export type BasicAuthConfig = {
  username: string;
  password?: string;
};

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
