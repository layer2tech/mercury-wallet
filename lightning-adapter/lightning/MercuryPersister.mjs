import { Result_ChannelMonitorUpdateDecodeErrorZ, ChannelMonitorUpdateStatus, Result_NoneErrorZ } from "lightningdevkit";

class MercuryPersister {
  persist_new_channel(channel_id, data, update_id) {
    // const channel_monitor_bytes = data.write();
    // <insert code to write these bytes to disk, keyed by `id`>
    return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
  }

  update_persisted_channel(channel_id, update, data, update_id) {
    // const channel_monitor_bytes = data.write();
    // <insert code to update the `ChannelMonitor`'s file on disk with these
    //  new bytes, keyed by `id`>
    return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
  }
}

export default MercuryPersister;
