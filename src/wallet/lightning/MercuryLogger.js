import { Logger } from "lightningdevkit";

class MercuryLogger extends Logger {
  log(record) {
    console.log('File: ', record.get_file())
    console.log('level: ', record.get_level());
    console.log('line: ', record.get_line());
    console.log(record.get_module_path() + ": " + record.get_args());
  }
}

export default MercuryLogger;
