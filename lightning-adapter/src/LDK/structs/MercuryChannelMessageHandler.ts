import {
  ChannelMessageHandler,
  InitFeatures,
  OpenChannel,
} from "lightningdevkit";

class MercuryChannelMessageHandler extends ChannelMessageHandler {
  // TODO: Lookup why this has been made into a custom class
  /*
  override handle_open_channel(
    their_node_id: Uint8Array,
    msg: OpenChannel
  ): void {

  } */
}

export default MercuryChannelMessageHandler;
