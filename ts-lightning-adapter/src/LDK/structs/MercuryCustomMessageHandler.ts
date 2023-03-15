import {
  CustomMessageHandler,
  Result_NoneLightningErrorZ,
  Type,
} from "lightningdevkit";

class MercuryCustomMessageHandler extends CustomMessageHandler {
  override handle_custom_message(
    msg: Type,
    sender_node_id: Uint8Array
  ): Result_NoneLightningErrorZ {
    return Result_NoneLightningErrorZ.constructor_ok();
  }
}

export default MercuryCustomMessageHandler;
