import { VisibilityMonitor } from "./visibility.js";
import { AuditLogger } from "./audit-log.js";
import { StorageGuard } from "./storage-guard.js";
import { guardNavigation } from "./navigation-guard.js";

export class SecurityManager {
  constructor() {
    this.visibility = new VisibilityMonitor();
    this.audit = new AuditLogger();
    this.storage = new StorageGuard();
    this.started = false;
  }

  start() {
    if (this.started) return;
    this.started = true;

    this.visibility.start();

    window.addEventListener("anura:visibility", event => {
      this.audit.log(event.detail);
    });

    this.audit.log({ type: "security_initialized" });
  }

  validateUrl(input) {
    const result = guardNavigation(input);
    if (!result.allowed) {
      this.audit.log({ type: "url_rejected" });
    }
    return result;
  }

  getStatus() {
    return {
      visibility: this.visibility.snapshot(),
      events: this.audit.getAll()
    };
  }

  stop() {
    this.visibility.stop();
    this.started = false;
  }
}
