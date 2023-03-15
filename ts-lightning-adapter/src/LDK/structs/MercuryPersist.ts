import {
  ChannelMonitor,
  ChannelMonitorUpdate,
  ChannelMonitorUpdateStatus,
  MonitorUpdateId,
  OutPoint,
  PersistInterface,
} from "lightningdevkit";
import fs from "fs";

class MercuryPersist implements PersistInterface {
  update_persisted_channel(
    channel_id: OutPoint,
    update: ChannelMonitorUpdate,
    data: ChannelMonitor,
    update_id: MonitorUpdateId
  ): ChannelMonitorUpdateStatus {
    let channel_monitor_bytes = data.write();
    let updated_channel = {
      channel_id: channel_id.to_channel_id().toString(),
      data: channel_monitor_bytes,
    };

    try {
      let file_contents = fs.readFileSync("channel_monitor.json", "utf8");
      let channels = JSON.parse(file_contents);

      channels[channel_id.to_channel_id().toString()] = updated_channel;
      fs.writeFileSync("channel_monitor.json", JSON.stringify(channels));

      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
    } catch (error) {
      console.error(error);
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_PermanentFailure;
    }
  }
  persist_new_channel(
    channel_id: OutPoint,
    data: ChannelMonitor,
    update_id: MonitorUpdateId
  ): ChannelMonitorUpdateStatus {
    let channel_monitor_bytes = data.write();
    let new_channel = { channel_id, data: channel_monitor_bytes };

    try {
      let file_contents = fs.readFileSync("channel_monitor.json", "utf8");
      let channels = JSON.parse(file_contents);

      channels[channel_id.to_channel_id().toString()] = new_channel;
      fs.writeFileSync("channel_monitor.json", JSON.stringify(channels));

      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
    } catch (error) {
      console.error(error);
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_PermanentFailure;
    }
  }
}

export default MercuryPersist;
