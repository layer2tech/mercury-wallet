import { OnionMessageHandler } from "lightningdevkit";

class MercuryOnionMessageHandler extends OnionMessageHandler {
  handle_open_channel(nodeId, features, msg) {
    // do something here
  }
}

export default MercuryOnionMessageHandler;