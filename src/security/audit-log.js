const ALLOWED_VISIBILITY = new Set(["visible", "hidden", "prerender", "unloaded"]);

export function createAuditEvent(input = {}) {
  const visibility = ALLOWED_VISIBILITY.has(input.visibility)
    ? input.visibility
    : "unknown";

  return {
    type: String(input.type || "unknown").slice(0, 40),
    visibility,
    hidden: Boolean(input.hidden),
    focused: Boolean(input.focused),
    timestamp: new Date().toISOString()
  };
}

export class AuditLogger {
  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries;
    this.entries = [];
  }

  log(input) {
    const event = createAuditEvent(input);
    this.entries.unshift(event);
    if (this.entries.length > this.maxEntries) this.entries.pop();
    return event;
  }

  getAll() {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
  }
}
