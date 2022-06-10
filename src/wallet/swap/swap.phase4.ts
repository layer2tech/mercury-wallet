// Logger import.
import { SwapStep, SwapStepResult, SWAP_STATUS } from "./swap_utils";
import { STATECOIN_STATUS } from "..";
import Swap from "./swap"


export function swapPhase4(swap: Swap): SwapStep[] {
  return [
    new SwapStep(
      swap,
      SWAP_STATUS.Phase4, "transferReceiver",
      (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
      (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase4 },
      (s: Swap) => {        
          if (s.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0. Exiting s.");
          if (s.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1. Exiting s.");
          if (s.statecoin.swap_batch_data === null) throw Error("No swap batch transfer data for coin. Exiting s.")
          if (s.statecoin.swap_transfer_msg_3_receiver === null) throw Error("No transfer_msg_3_receiver. Exiting s.")
          return true
      },
      (s: Swap) => { return s.transferReceiver }
    ),
    new SwapStep(
      swap,
      SWAP_STATUS.Phase4, "swapPhase4PollSwap",
      (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
      (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase4 },
      (s: Swap) => {
          if (s.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0. Exiting s.");
          if (s.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.  s.");
          if (s.statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1. Exiting s.");
          return true
      },
      (s: Swap) => { return s.swapPhase4PollSwap }
    ),
    new SwapStep(
      swap,
      SWAP_STATUS.Phase4, "transferReceiverFinalize",
      (s: Swap) => { return s.statecoin.status === STATECOIN_STATUS.IN_SWAP },
      (s: Swap) => { return s.statecoin.swap_status === SWAP_STATUS.Phase4 },
      (s: Swap) => {
          if (s.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0. Exiting s.");
          if (s.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1. Exiting s.");
          if (s.statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1. Exiting s.");
          return true
      },
      (s: Swap) => { return s.transferReceiverFinalize }
    )
  ]
}
