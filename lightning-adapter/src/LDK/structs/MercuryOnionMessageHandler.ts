import { OnionMessage, OnionMessageHandler } from "lightningdevkit";

class MercuryOnionMessageHandler extends OnionMessageHandler {
  override handle_onion_message(
    peer_node_id: Uint8Array,
    msg: OnionMessage
  ): void {
    // do something here
  }
}

export default MercuryOnionMessageHandler;
