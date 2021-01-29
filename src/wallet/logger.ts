// Logger writes to console and optionally file.
// levels 1-error, 2-warn, 3-info, 4-debug.

export class Logger {
  file_loc: string;
  write_to_file: boolean;
  level: number;

  constructor(level: number, write_to_file: boolean, file_loc?: string) {
    this.level = level;
    this.write_to_file = write_to_file;
    this.file_loc = file_loc !== undefined ?  file_loc : "./log";
  }

  log(msg: string) {
    // add date and time
    console.log(msg)
    if (this.write_to_file) {
      // file.write(msg)
    }
  }

  debug(msg: string) {
    if (this.level > 3) {
      this.log("DEBUG: "+msg)
    }
  }

  info(msg: string) {
    if (this.level > 2) {
      this.log("INFO: "+msg)
    }
  }

  warn(msg: string) {
    if (this.level > 1) {
      this.log("WARN: "+msg)
    }
  }

  error(msg: string) {
    if (this.level > 0) {
      this.log("ERROR: "+msg)
    }
  }

}
