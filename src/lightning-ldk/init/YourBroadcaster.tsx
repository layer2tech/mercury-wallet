import { BroadcasterInterfaceInterface } from "lightningdevkit";
import { MARKER_BROADCAST } from "../const";
import { bytesToHex, dispatchEvent } from "./utils";

class YourBroadcaster implements BroadcasterInterfaceInterface {
    broadcast_transaction(tx: Uint8Array): void {
        console.log('ReactLDK: ', "broadcaster sends an event asking to broadcast some txhex...");
        let txhex = bytesToHex(tx);
        dispatchEvent(MARKER_BROADCAST, txhex);
    }
}
  

export default YourBroadcaster;