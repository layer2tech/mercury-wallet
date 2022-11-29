import * as ldk from "lightningdevkit";
import { Persist } from "lightningdevkit";

class MercuryPersister extends Persist {
  persist_new_channel(channel_id, data, update_id) {
    console.log("persist_new_channel");
    return ldk.Result_NoneChannelMonitorUpdateErrZ.constructor_ok();
  }

  update_persisted_channel(channel_id, update, data, update_id) {
    console.log("persist_new_channel");
    return ldk.Result_NoneChannelMonitorUpdateErrZ.constructor_ok();
  }
}

export default MercuryPersister;
