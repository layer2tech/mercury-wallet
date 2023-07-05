// Logger import.
'use strict';
import { SwapStep, SWAP_STATUS } from "./swap_utils";
import { STATECOIN_STATUS } from "..";
import Swap from "./swap";
import { RootStateOrAny, useSelector } from "react-redux";


export function swapPhase4(swap: Swap): SwapStep[] {
  const { excluded_txids } = useSelector((state: RootStateOrAny) => state.walletData.excluded_txids);

  return [
    // Step 14
    new SwapStep( 
      SWAP_STATUS.Phase4, "transferReceiver",
      () => { return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP },
      () => { return swap.statecoin.swap_status === SWAP_STATUS.Phase4 },
      () => {
        if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0. Exiting swap.");
        if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1. Exiting swap.");
        if (swap.statecoin.swap_batch_data === null) throw Error("No swap batch transfer data for coin. Exiting swap.")
        if (swap.statecoin.swap_transfer_msg_3_receiver === null) throw Error("No transfer_msg_3_receiver. Exiting swap.")
        return true
      },
      () => swap.transferReceiver(excluded_txids)
    ),
    // Step 15
    new SwapStep(
      SWAP_STATUS.Phase4, "swapPhase4PollSwap",
      () => { return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP },
      () => { return swap.statecoin.swap_status === SWAP_STATUS.Phase4 },
      () => {
        if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0. Exiting swap.");
        if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1. Exiting swap.");
        if (swap.statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1. Exiting swap.");
        return true
      },
      swap.swapPhase4PollSwap
    ),
    // Step 16
    new SwapStep(
      SWAP_STATUS.Phase4, "transferReceiverFinalize",
      () => { return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP },
      () => { return swap.statecoin.swap_status === SWAP_STATUS.Phase4 },
      () => {
        if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0. Exiting swap.");
        if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1. Exiting swap.");
        if (swap.statecoin.swap_transfer_finalized_data === null) throw Error("No transfer finalize data found for coin. Transfer finalize data should be set in Phase1. Exiting swap.");
        return true
      },
      swap.transferReceiverFinalize
    )
  ]
}
