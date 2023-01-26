import { ChannelMessageHandler, InitFeatures, OpenChannel } from "lightningdevkit";

class MercuryChannelMessageHandler extends ChannelMessageHandler{
    handle_open_channel(their_node_id: Uint8Array, their_features: InitFeatures, msg: OpenChannel): void {
        // do something here
    }
}

export default MercuryChannelMessageHandler;