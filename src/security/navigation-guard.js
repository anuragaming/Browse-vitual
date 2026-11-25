import { validateNavigation } from "./url-guard.js";

export function guardNavigation(input, ownOrigin = location.origin) {
  const result = validateNavigation(input, ownOrigin);
  return result.valid
    ? { allowed: true, url: result.url }
    : { allowed: false, reason: result.reason };
}
