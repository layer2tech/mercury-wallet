import {
  ChannelMonitor,
  ChannelMonitorUpdate,
  ChannelMonitorUpdateStatus,
  MonitorUpdateId,
  OutPoint,
  PersistInterface,
} from "lightningdevkit";
import fs from 'fs';
import path from 'path';
const CHANNELS_DIR = './channels';
const CHANNELS_DICT_FILE = 'channels.json';

interface ChannelsDict {
  [id: string]: string;
}

class MercuryPersist implements PersistInterface {
  private channelsDict: ChannelsDict = {};

  constructor() {
    this.loadChannelsDict();
  }

  private loadChannelsDict() {
    const dictPath = path.join(CHANNELS_DIR, CHANNELS_DICT_FILE);
    try {
      const dictString = fs.readFileSync(dictPath, 'utf8');
      this.channelsDict = JSON.parse(dictString);
    } catch (err) {
      console.warn(`Failed to load channels dictionary: ${err}`);
    }
  }

  private saveChannelsDict() {
    const dictPath = path.join(CHANNELS_DIR, CHANNELS_DICT_FILE);
    fs.writeFileSync(dictPath, JSON.stringify(this.channelsDict), 'utf8');
  }

  private getNextFileName(): string {
    const count = Object.keys(this.channelsDict).length + 1;
    return `${count}.dat`;
  }

  private getChannelFileName(channelId: OutPoint): string | null {
    const channelIdStr = channelId.to_channel_id().toString();
    return this.channelsDict[channelIdStr] || null;
  }

  persist_new_channel(channel_id: OutPoint, data: ChannelMonitor, update_id: MonitorUpdateId): ChannelMonitorUpdateStatus {
    try {
      const channel_monitor_bytes = data.write();
      const file_name = this.getNextFileName();
      const file_path = path.join(CHANNELS_DIR, file_name);
      fs.writeFileSync(file_path, channel_monitor_bytes);
      const channelIdStr = channel_id.to_channel_id().toString();
      this.channelsDict[channelIdStr] = file_name;
      this.saveChannelsDict();
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
    } catch (e) {
      console.error('Error occurred in persist_new_channel', e);
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_PermanentFailure;
    }
  }

  update_persisted_channel(channel_id: OutPoint, update: ChannelMonitorUpdate, data: ChannelMonitor, update_id: MonitorUpdateId): ChannelMonitorUpdateStatus {
    try {
      const channelIdStr = channel_id.to_channel_id().toString();
      const file_name = this.getChannelFileName(channel_id);
      if (!file_name) {
        console.error(`Could not find file name for channel ${channelIdStr}`);
        return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_PermanentFailure;
      }
      const file_path = path.join(CHANNELS_DIR, file_name);
      const channel_monitor_bytes = data.write();
      fs.writeFileSync(file_path, channel_monitor_bytes);
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
    } catch (e) {
      console.error('Error occurred in update_persisted_channel', e);
      return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_PermanentFailure;
    }
  }
}

export default MercuryPersist;
