import { NodeAnnouncement, Result_boolLightningErrorZ, RoutingMessageHandler } from "lightningdevkit";

class MercuryRoutingMessageHandler extends RoutingMessageHandler{
    handle_node_announcement(msg: NodeAnnouncement): Result_boolLightningErrorZ {
        return
    }
}

export default MercuryRoutingMessageHandler;