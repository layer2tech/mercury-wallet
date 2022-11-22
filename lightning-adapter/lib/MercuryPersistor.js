import { Persist, Result_NoneChannelMonitorUpdateErrZ } from "lightningdevkit";

class MercuryPersister extends Persist {
  read_channelmonitors() {
    return Result_NoneChannelMonitorUpdateErrZ.constructor_ok();
  }

  persist_new_channel(channel_id, data, update_id) {
    // const channel_monitor_bytes = data.write();
    // <insert code to write these bytes to disk, keyed by `id`>
    return Result_NoneChannelMonitorUpdateErrZ.constructor_ok();
  }

  update_persisted_channel(channel_id, update, data, update_id) {
    // const channel_monitor_bytes = data.write();
    // <insert code to update the `ChannelMonitor`'s file on disk with these
    //  new bytes, keyed by `id`>
    return Result_NoneChannelMonitorUpdateErrZ.constructor_ok();
  }
}

export default MercuryPersister;
