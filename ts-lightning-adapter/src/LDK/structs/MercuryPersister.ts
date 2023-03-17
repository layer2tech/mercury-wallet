import {
  ChannelManager,
  NetworkGraph,
  PersisterInterface,
  Result_NoneErrorZ,
  WriteableScore,
} from "lightningdevkit";

class MercuryPersister implements PersisterInterface {
  persist_manager(channel_manager: ChannelManager): Result_NoneErrorZ {
    throw new Error("Method not implemented.");
  }
  persist_graph(network_graph: NetworkGraph): Result_NoneErrorZ {
    throw new Error("Method not implemented.");
  }
  persist_scorer(scorer: WriteableScore): Result_NoneErrorZ {
    throw new Error("Method not implemented.");
  }
}

export default MercuryPersister;
