// Browser-only module. Do not import this module into the Worker entrypoint.
export class VisibilityMonitor {
  constructor({ maxEvents = 100, targetWindow = window, targetDocument = document } = {}) {
    this.events = [];
    this.maxEvents = maxEvents;
    this.win = targetWindow;
    this.doc = targetDocument;
    this.started = false;
    this.handlers = [];
  }

  snapshot() {
    return {
      visibility: this.doc.visibilityState || "unknown",
      hidden: Boolean(this.doc.hidden),
      focused: Boolean(this.doc.hasFocus?.()),
      timestamp: new Date().toISOString()
    };
  }

  record(type) {
    const event = { type, ...this.snapshot() };
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) this.events.pop();

    this.win.dispatchEvent(new CustomEvent("anura:visibility", {
      detail: event
    }));

    return event;
  }

  start() {
    if (this.started) return;
    this.started = true;

    const listen = (target, name, handler) => {
      target.addEventListener(name, handler);
      this.handlers.push(() => target.removeEventListener(name, handler));
    };

    listen(this.doc, "visibilitychange", () => this.record("visibilitychange"));
    listen(this.win, "focus", () => this.record("focus"));
    listen(this.win, "blur", () => this.record("blur"));
    listen(this.win, "pageshow", () => this.record("pageshow"));
    listen(this.win, "pagehide", () => this.record("pagehide"));

    this.record("initialized");
  }

  stop() {
    this.handlers.forEach(remove => remove());
    this.handlers = [];
    this.started = false;
  }

  getEvents() {
    return this.events.map(event => ({ ...event }));
  }
}
