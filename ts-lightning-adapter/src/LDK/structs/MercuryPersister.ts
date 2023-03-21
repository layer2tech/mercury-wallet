import fs from "fs";
import {
  ChannelManager,
  NetworkGraph,
  PersisterInterface,
  Result_NoneErrorZ,
  WriteableScore,
} from "lightningdevkit";

class MercuryPersister implements PersisterInterface {
  persist_manager(channel_manager: ChannelManager): Result_NoneErrorZ {
    let data = channel_manager.write();
    try {
      // write to disk
      //fs.writeFileSync("channel_manager_data.json", JSON.stringify(data));
      const buffer = Buffer.from(data);
      fs.writeFileSync("channel_manager_data.bin", buffer);

      return Result_NoneErrorZ.constructor_ok();
    } catch (e: any) {
      return Result_NoneErrorZ.constructor_err(e);
    }
  }
  persist_graph(network_graph: NetworkGraph): Result_NoneErrorZ {
    let data = network_graph.write();
    try {
      // write to disk
      const buffer = Buffer.from(data);
      fs.writeFileSync("network_graph_data.bin", buffer);
      return Result_NoneErrorZ.constructor_ok();
    } catch (e: any) {
      return Result_NoneErrorZ.constructor_err(e);
    }
  }
  persist_scorer(scorer: WriteableScore): Result_NoneErrorZ {
    let data = scorer.write();
    try {
      // write to disk
      const buffer = Buffer.from(data);
      fs.writeFileSync("writable_score_data.bin", buffer);
      return Result_NoneErrorZ.constructor_ok();
    } catch (e: any) {
      return Result_NoneErrorZ.constructor_err(e);
    }
  }
}

export default MercuryPersister;
