

import { Filter } from "lightningdevkit";

class MercuryFilter extends Filter {
  register_tx(txid, script_pubkey) {
    // <insert code for you to watch for this transaction on-chain>
  }

  register_output(output) {
    // <insert code for you to watch for any transactions that spend this
    //  output on-chain>
  }
}

export default MercuryFilter;