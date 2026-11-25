const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain"
]);

function isPrivateIPv4(host) {
  const parts = host.split(".");
  if (parts.length !== 4 || parts.some(p => !/^\d+$/.test(p))) return false;

  const nums = parts.map(Number);
  if (nums.some(n => n < 0 || n > 255)) return false;

  const [a, b] = nums;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateOrLocalHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    return true;
  }

  if (host.includes(":")) {
    // Conservative IPv6 local/private rejection.
    return (
      host === "::1" ||
      host === "::" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80:")
    );
  }

  return isPrivateIPv4(host);
}

export function validatePublicWebUrl(input, ownOrigin = "") {
  if (typeof input !== "string" || input.length < 1 || input.length > 2048) {
    return { valid: false, reason: "URL must be a string of 1–2048 characters" };
  }

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return { valid: false, reason: "Malformed URL" };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, reason: "Only HTTP and HTTPS URLs are supported" };
  }

  if (!parsed.hostname || parsed.username || parsed.password) {
    return { valid: false, reason: "Invalid URL authority" };
  }

  if (isPrivateOrLocalHost(parsed.hostname)) {
    return { valid: false, reason: "Local and private network hosts are blocked" };
  }

  if (ownOrigin && parsed.origin === ownOrigin) {
    return { valid: false, reason: "Embedding the Anura origin is blocked" };
  }

  return {
    valid: true,
    url: parsed.href,
    hostname: parsed.hostname
  };
}
