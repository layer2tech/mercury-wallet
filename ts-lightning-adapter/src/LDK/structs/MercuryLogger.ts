import { Level, LoggerInterface } from "lightningdevkit";

class MercuryLogger implements LoggerInterface{
    log(record: any){
        if (record.get_level() == Level.LDKLevel_Gossip) return;
        console.log('Logged Here..')
        console.log(record.get_module_path() + ": " + record.get_args());
    }
}

export default MercuryLogger;