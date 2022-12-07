import { ChannelMonitor, ChannelMonitorUpdate, MonitorUpdateId, OutPoint, PersistInterface, Result_NoneChannelMonitorUpdateErrZ } from "lightningdevkit";
import { MARKER_PERSIST } from "../const";
import { bytesToHex, dispatchEvent } from "./utils";

class YourPersister implements PersistInterface{
    persist_new_channel(channel_id: OutPoint, data: ChannelMonitor, update_id: MonitorUpdateId): Result_NoneChannelMonitorUpdateErrZ {
        const channel_monitor_bytes = data.write();

        console.log("LDK: persist_new_channel");

        const params = {
            id: bytesToHex(channel_id.write()),
            data: bytesToHex(channel_monitor_bytes)
        }

        dispatchEvent(MARKER_PERSIST, params);

        return Result_NoneChannelMonitorUpdateErrZ.constructor_ok();

    }
    update_persisted_channel(channel_id: OutPoint, update: ChannelMonitorUpdate, data: ChannelMonitor, update_id: MonitorUpdateId): Result_NoneChannelMonitorUpdateErrZ {
        const channel_monitor_bytes = data.write();
        console.log("LDK: update_persisted_channel");

        const params = {
            id: bytesToHex(channel_id.write()),
            data: bytesToHex(channel_monitor_bytes)
        }

        dispatchEvent(MARKER_PERSIST, params);

        return Result_NoneChannelMonitorUpdateErrZ.constructor_ok();
    }

}

export default YourPersister;