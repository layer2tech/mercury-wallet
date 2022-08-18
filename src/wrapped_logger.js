// wrapper class for logging on machines of windows and web version
export default class WrappedLogger {
  log = null;
  development = false;

  constructor(version) {
    console.log("version passed:", version);
    if (typeof version === "undefined" || version === null) return;
    if (typeof version.NODE_ENV === "undefined" || version.NODE_ENV === null) {
      return;
    }

    if (version.NODE_ENV === "development") {
      try {
        this.log = window.require("electron-log");
      } catch (e) {
        this.log = require("electron-log");
      }
      this.development = true;
    }
  }

  warn(msg) {
    if (this.development) {
      this.log.warn(msg);
    }
  }

  debug(msg) {
    if (this.development) {
      this.log.debug(msg);
    }
  }

  info(msg, data) {
    if (this.development) {
      this.log.debug(msg, data);
    }
  }

  error(msg) {
    if (this.development) {
      this.log.error(msg);
    }
  }
}
