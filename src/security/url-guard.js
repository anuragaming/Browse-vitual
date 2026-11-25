import { validatePublicWebUrl } from "../utils/validation.js";

export function validateNavigation(input, ownOrigin = location.origin) {
  return validatePublicWebUrl(input, ownOrigin);
}
