import {
  ChannelMonitor,
  ChannelMonitorUpdate,
  ChannelMonitorUpdateStatus,
  MonitorUpdateId,
  OutPoint,
  PersistInterface,
} from "lightningdevkit";
import fs from "fs";

import JSONbig from "json-bigint";

class MercuryPersist implements PersistInterface {
  update_persisted_channel(
    channel_id: OutPoint,
    update: ChannelMonitorUpdate,
    data: ChannelMonitor,
    update_id: MonitorUpdateId
  ): ChannelMonitorUpdateStatus {
    try{
      let channel_monitor_bytes = data.write();
      let updated_channel = {
        channel_id: channel_id.to_channel_id().toString(),
        data: channel_monitor_bytes,
      };

      let file_path = "channel_monitor.json";
      let channels: any = {};

      if (fs.existsSync(file_path)) {
        let file_contents = fs.readFileSync(file_path, "utf8");
        channels = JSONbig.parse(file_contents);
      }
      channels[channel_id.to_channel_id().toString()] = updated_channel;
      fs.writeFileSync(file_path, JSONbig.stringify(channels));
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
    }catch(e){
      console.log('Error occured in update_persisted_channel', e)
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_PermanentFailure;
    }
  }

  persist_new_channel(
    channel_id: OutPoint,
    data: ChannelMonitor,
    update_id: MonitorUpdateId
  ): ChannelMonitorUpdateStatus {

    try{
      let channel_monitor_bytes = data.write();
      let new_channel = { channel_id, data: channel_monitor_bytes };

      let file_path = "channel_monitor.json";
      let channels: any = {};

      if (fs.existsSync(file_path)) {
        let file_contents = fs.readFileSync(file_path, "utf8");
        channels = JSONbig.parse(file_contents);
      }

      channels[channel_id.to_channel_id().toString()] = new_channel;
      fs.writeFileSync(file_path, JSONbig.stringify(channels));

      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
    }catch(e){
      console.log('Error occured in persist_new_channel', e)
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_PermanentFailure;
    } 
  }
}

export default MercuryPersist;
