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
const CHANNELS_DICT_FILE = 'channel_lookup.json';

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
      if (!fs.existsSync(dictPath)) {
        fs.writeFileSync(dictPath, '[]'); // Create an empty file if it doesn't exist
        console.log(`Created channels dictionary file: ${dictPath}`);
        this.channelsDict = {};
      } else {
        console.warn(`Failed to load channels dictionary: ${err}`);
      }
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

  private getHighestFileCounter(lookup: Array<any>): number {
    let highestCounter = 0;
    lookup.forEach(entry => {
      const monitor_file_name_parts = entry.monitor_file_name.split('_');
      const id_file_name_parts = entry.id_file_name.split('_');
      if (monitor_file_name_parts[0] === 'channelMonitor' && id_file_name_parts[0] === 'channelId') {
        const fileCounter = parseInt(monitor_file_name_parts[1]);
        if (fileCounter > highestCounter) {
          highestCounter = fileCounter;
        }
      }
    });
    return highestCounter;
  }

  private createLookupFile() {
    const lookup: Array<any> = [];
    fs.writeFileSync('channels/channel_lookup.json', JSON.stringify(lookup));
  }

  persist_new_channel(channel_id: OutPoint, data: ChannelMonitor, update_id: MonitorUpdateId): ChannelMonitorUpdateStatus {
    try {
      const channel_monitor_bytes = data.write(); // serialize the channel monitor data
      const channel_id_bytes = channel_id.write(); // serialize the channel ID

      // check if lookup file exists, and create it if it doesn't
      if (!fs.existsSync('channels/channel_lookup.json')) {
        this.createLookupFile();
      }

      // read existing lookup file
      const lookup = JSON.parse(fs.readFileSync('channels/channel_lookup.json').toString());

      // check if channel ID already exists in lookup table
      const existingEntryIndex = lookup.findIndex((entry: any) => entry.key === channel_id.to_channel_id().toString());
      if (existingEntryIndex >= 0) {
        console.log(`Channel ID ${channel_id.to_channel_id().toString()} already exists in lookup table`);

        // Replace the existing channelmonitor bytes with the new one
        const existingEntry = lookup[existingEntryIndex];
        const existingMonitorFilePath = existingEntry.monitor_file_name;
        fs.writeFileSync(existingMonitorFilePath, channel_monitor_bytes);

        return ChannelMonitorUpdateStatus.LDKChannelMonitorUpdateStatus_Completed;
      }

      // generate file names based on the highest existing file counter in the lookup table
      let fileCounter = 0;
      lookup.forEach((entry: any) => {
        const parts = entry.monitor_file_name.split('_');
        if (parts.length === 2 && parts[0] === 'channels/channelMonitor') {
          const counter = parseInt(parts[1].replace('.dat', ''), 10);
          if (!isNaN(counter) && counter > fileCounter) {
            fileCounter = counter;
          }
        }
      });
      fileCounter += 1;
      const monitor_file_name = `channels/channelMonitor_${fileCounter}.dat`;
      const id_file_name = `channels/channelId_${fileCounter}.dat`;

      // save the channel monitor data to a file
      fs.writeFileSync(monitor_file_name, channel_monitor_bytes);

      // save the channel ID to a file
      fs.writeFileSync(id_file_name, channel_id_bytes);

      let key = channel_id.to_channel_id().toString();
      // save the file names to the lookup file
      const newEntry = { key, monitor_file_name, id_file_name };
      lookup.push(newEntry); // add new entry to the lookup array
      fs.writeFileSync('channels/channel_lookup.json', JSON.stringify(lookup)); // write updated lookup back to file

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
