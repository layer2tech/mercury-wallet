import { CustomMessageHandler } from "lightningdevkit";

class MercuryCustomMessageHandler extends CustomMessageHandler {
  handle_open_channel(nodeId, features, msg) {
    // do something here
  }
}

export default MercuryCustomMessageHandler;