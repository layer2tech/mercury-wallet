import { FilterInterface, WatchedOutput } from "lightningdevkit";

class MercuryFilter implements FilterInterface {
  register_tx(txid: Uint8Array, script_pubkey: Uint8Array): void {}

  register_output(output: WatchedOutput): void {}
}

export default MercuryFilter;
