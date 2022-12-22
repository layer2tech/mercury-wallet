import { RoutingMessageHandler } from "lightningdevkit";

class MercuryRoutingMessageHandler extends RoutingMessageHandler {
  handle_node_announcement(msg) {
    // do something here
  }
}

export default MercuryRoutingMessageHandler;