import {
  ChannelMonitor,
  ChannelMonitorUpdate,
  ChannelMonitorUpdateStatus,
  MonitorUpdateId,
  OutPoint,
  PersistInterface,
} from "lightningdevkit";

class MercuryPersist implements PersistInterface {
  update_persisted_channel(
    channel_id: OutPoint,
    update: ChannelMonitorUpdate,
    data: ChannelMonitor,
    update_id: MonitorUpdateId
  ): ChannelMonitorUpdateStatus {
    console.log(
      "************************************************************ update_persisted_channel called: *********************************************************************"
    );

    throw "test";

    return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
  }
  persist_new_channel(
    channel_id: OutPoint,
    data: ChannelMonitor,
    update_id: MonitorUpdateId
  ): ChannelMonitorUpdateStatus {
    console.log(
      "************************************************************ persist_new_channel called: *********************************************************************"
    );

    throw "test";

    return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
  }
}

export default MercuryPersist;
