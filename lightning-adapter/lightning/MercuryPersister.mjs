import { Result_ChannelMonitorUpdateDecodeErrorZ } from "lightningdevkit";

class MercuryPersister {
  persist_new_channel(channel_id, data, update_id) {
    // const channel_monitor_bytes = data.write();
    // <insert code to write these bytes to disk, keyed by `id`>
    return Result_ChannelMonitorUpdateDecodeErrorZ.constructor_ok();
  }

  update_persisted_channel(channel_id, update, data, update_id) {
    // const channel_monitor_bytes = data.write();
    // <insert code to update the `ChannelMonitor`'s file on disk with these
    //  new bytes, keyed by `id`>
    return Result_ChannelMonitorUpdateDecodeErrorZ.constructor_ok();
  }
}

export default MercuryPersister;
