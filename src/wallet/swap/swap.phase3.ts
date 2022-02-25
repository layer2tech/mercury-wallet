
import { SWAP_STATUS, SwapStep } from "./swap_utils";
import { STATECOIN_STATUS } from ".."
import Swap from "./swap"

// Poll swap until phase changes to Phase3/4. In that case all carry out transfer_sender
export function swapPhase3(swap: Swap): SwapStep[] {
    return [
    new SwapStep(
    SWAP_STATUS.Phase3, "pollSwapPhase3",
    () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
    () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase3},
    () => { 
      if (swap.statecoin.swap_id === null) throw Error("No Swap ID found. Swap ID should be set in Phase0.");
      if (swap.statecoin.swap_info === null) throw Error("No swap info found for coin. Swap info should be set in Phase1.");
      if (swap.statecoin.swap_address === null) throw Error("No swap address found for coin. Swap address should be set in Phase1.");
      if (swap.statecoin.swap_receiver_addr === null) throw Error("No receiver address found for coin. Receiver address should be set in Phase1.");
      return true
    },
    swap.pollSwapPhase3
  ),
  new SwapStep(
    SWAP_STATUS.Phase3, "transferSender",
    () => {return swap.statecoin.status === STATECOIN_STATUS.IN_SWAP},
    () => {return swap.statecoin.swap_status === SWAP_STATUS.Phase3},
    () => { return true },
    swap.transferSender
  ),
  new SwapStep(
    SWAP_STATUS.Phase3, "getTransferMsg3",
    () => {return true},
    () => {return true},
    () => { 
      if (swap.statecoin.swap_transfer_msg === null) throw Error("No swap transfer message for coin.")
      return true
    },
    swap.getTransferMsg3
  ),
  new SwapStep(
    SWAP_STATUS.Phase3, "makeSwapCommitment",
    () => {return true},
    () => {return true},
    () => { 
      if (swap.statecoin.swap_transfer_msg_3_receiver === null) throw Error("No transfer_msg_3_receiver.")
      return true;
    },
    swap.makeSwapCommitment
  )
]
}