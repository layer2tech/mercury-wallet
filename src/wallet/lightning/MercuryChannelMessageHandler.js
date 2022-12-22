import { ChannelMessageHandler } from "lightningdevkit";

class MercuryChannelMessageHandler extends ChannelMessageHandler {
  handle_open_channel(nodeId, features, msg) {
    // do something here
  }
}

export default MercuryChannelMessageHandler;