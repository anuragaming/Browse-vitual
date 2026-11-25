// Namespacing and defensive JSON parsing; this is not encryption.
// Do not store passwords, authentication tokens, or third-party cookies here.
export class StorageGuard {
  constructor(prefix = "anura_v3_") {
    this.prefix = prefix;
  }

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch {
      return false;
    }
  }
}
