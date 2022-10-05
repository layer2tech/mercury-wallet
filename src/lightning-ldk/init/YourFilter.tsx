import { FilterInterface, Option_C2Tuple_usizeTransactionZZ, WatchedOutput } from "lightningdevkit";
import { MARKER_REGISTER_OUTPUT, MARKER_REGISTER_TX } from "../const";
import { bytesToHex,dispatchEvent } from "./utils";

class YourFilter implements FilterInterface {

    register_tx(txid: Uint8Array, script_pubkey: Uint8Array): void {

        console.log('LDK: register_tx');

        const params = {
            txid: bytesToHex(txid),
            script_pubkey: bytesToHex(script_pubkey)
        }

        dispatchEvent(MARKER_REGISTER_TX, params);
    }


    register_output(output: WatchedOutput): Option_C2Tuple_usizeTransactionZZ {
        let params:Object
        const blockHash = output.get_block_hash();

        const index = output.get_outpoint().get_index().toString();
        const script_pubkey = bytesToHex(output.get_script_pubkey());

        if(blockHash instanceof Uint8Array){
            params = {
                block_hash: bytesToHex(blockHash),
                index: index,
                script_pubkey: script_pubkey
            }
        } else{
            params = {
                index: index,
                script_pubkey: script_pubkey
            }
        }

        dispatchEvent(MARKER_REGISTER_OUTPUT, params);

        return Option_C2Tuple_usizeTransactionZZ.constructor_none();
        
    }

}

export default YourFilter;