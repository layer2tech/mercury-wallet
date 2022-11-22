import { Logger } from "lightningdevkit";

class MercuryLogger extends Logger {
  log(record) {
    console.log(record.get_module_path() + ": " + record.get_args());
  }
}

export default MercuryLogger;
