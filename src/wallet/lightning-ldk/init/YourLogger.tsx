import { LoggerInterface, Record } from "lightningdevkit";


class YourLogger implements LoggerInterface{
    log(record: Record): void {
        console.log(record.get_module_path() + ": " + record.get_args());
    }
}

export default YourLogger
