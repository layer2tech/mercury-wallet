import { FilterInterface, WatchedOutput } from "lightningdevkit";

class MercuryFilter implements FilterInterface{
    register_tx(txid: Uint8Array, script_pubkey: Uint8Array): void {
        // <insert code for you to watch for this transaction on-chain>
    }

    register_output(output: WatchedOutput): void {
        // <insert code for you to watch for any transactions that spend this
        //  output on-chain>
    }
}

export default MercuryFilter;